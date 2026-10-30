import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AIError, callAI, parseJSON, type AIMessage } from "./ai.server";
import type { RxMedicine } from "./types";

const langName: Record<string, string> = { en: "English", ta: "Tamil", hi: "Hindi", te: "Telugu" };
const imageSchema = z
  .string()
  .max(12_000_000)
  .refine((s) => /^data:(image\/(png|jpe?g|webp|gif|heic|heif)|application\/pdf);base64,/.test(s), "Unsupported file type");

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof AIError ? e.message : "Something went wrong while contacting the AI service." };
  }
}

const SAFETY = "You are MediAssist AI, a careful clinical medication assistant. Never invent information that is not visible or known. If unsure, say so. Never diagnose or change prescribed doses; advise confirming with a doctor or pharmacist.";

/* ---------- Prescription analysis ---------- */
export interface RxAnalysis {
  isPrescription: boolean;
  reason: string;
  doctor: string;
  clinic: string;
  date: string;
  patient: string;
  diagnosis: string;
  medicines: RxMedicine[];
  advice: string;
  warnings: string[];
  confidence: number;
  rawText: string;
}

export const analyzePrescription = createServerFn({ method: "POST" })
  .validator((d) => z.object({ image: imageSchema }).parse(d))
  .handler(({ data }) =>
    run(async () => {
      const prompt = `Read this medical prescription image (it may be handwritten or printed, possibly in Indian format with abbreviations like OD, BD, TDS, QID, HS, SOS, AC, PC, 1-0-1).
Return ONLY JSON with this exact shape:
{"isPrescription":boolean,"reason":string,"doctor":string,"clinic":string,"date":string,"patient":string,"diagnosis":string,
"medicines":[{"name":string,"strength":string,"form":string,"dosage":string,"frequency":string,"times":["HH:MM"],"timing":string,"durationDays":number,"purpose":string,"notes":string}],
"advice":string,"warnings":[string],"confidence":number,"rawText":string}
Rules:
- isPrescription=false if the image is not a prescription; explain in "reason" and leave medicines empty.
- "frequency" in plain English (e.g. "Twice daily"). "times" = sensible 24h clock times for each daily dose (1-0-1 => ["08:00","20:00"], OD => ["09:00"], TDS => ["08:00","14:00","20:00"], HS => ["21:30"]).
- "timing" e.g. "After food". "durationDays" 0 if not written.
- "purpose" = the common use of that medicine in simple words.
- "warnings" = important cautions (duplicate drugs, illegible items, known interactions between the listed medicines).
- "confidence" 0-100 for overall legibility. "rawText" = your transcription of the text.
- Use empty strings for anything not visible. Do not guess names you cannot read; mark them in warnings.`;
      const messages: AIMessage[] = [
        { role: "system", content: SAFETY },
        { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: data.image } }] },
      ];
      const r = parseJSON<RxAnalysis>(await callAI(messages, true));
      r.medicines = (r.medicines ?? []).map((m) => ({
        name: m.name ?? "",
        strength: m.strength ?? "",
        form: m.form ?? "",
        dosage: m.dosage ?? "",
        frequency: m.frequency ?? "",
        times: Array.isArray(m.times) ? m.times.filter((t) => /^\d{2}:\d{2}$/.test(t)) : [],
        timing: m.timing ?? "",
        durationDays: Number(m.durationDays) || 0,
        purpose: m.purpose ?? "",
        notes: m.notes ?? "",
      }));
      r.warnings = r.warnings ?? [];
      return r;
    }),
  );

/* ---------- Medicine verification ---------- */
export interface VerifyResult {
  identified: boolean;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  manufacturer: string;
  batch: string;
  expiry: string;
  isExpired: boolean | null;
  verdict: "match" | "mismatch" | "not_prescribed" | "expired" | "unclear";
  matchedWith: string;
  explanation: string;
  uses: string;
  sideEffects: string[];
  storage: string;
  warnings: string[];
  confidence: number;
}

export const verifyMedicine = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ image: imageSchema, expected: z.array(z.string().max(200)).max(50), target: z.string().max(200).optional(), language: z.enum(["en", "ta", "hi", "te"]).optional() }).parse(d),
  )
  .handler(({ data }) =>
    run(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `Identify the medicine in this photo (strip, bottle, box or label). Today's date is ${today}.
The patient's prescribed medicines are: ${data.expected.length ? data.expected.join("; ") : "none recorded"}.
${data.target ? `The patient expects this to be: ${data.target}.` : ""}
Compare the medicine in the photo against the prescribed list by active ingredient AND strength (brand names may differ).
Return ONLY JSON:
{"identified":boolean,"name":string,"genericName":string,"strength":string,"form":string,"manufacturer":string,"batch":string,"expiry":string,"isExpired":boolean|null,
"verdict":"match"|"mismatch"|"not_prescribed"|"expired"|"unclear","matchedWith":string,"explanation":string,"uses":string,"sideEffects":[string],"storage":string,"warnings":[string],"confidence":number}
Verdict rules: "expired" if the printed expiry is before today; "match" if same ingredient and strength as a prescribed item (put it in matchedWith); "mismatch" if same ingredient but different strength, or different from the expected medicine; "not_prescribed" if not on the list; "unclear" if the photo cannot be read. identified=false if no medicine is visible. Use empty strings when not visible.
Write "explanation", "uses", "sideEffects", "storage" and "warnings" in simple ${langName[data.language ?? "en"]} (keep medicine names as printed).`;
      const messages: AIMessage[] = [
        { role: "system", content: SAFETY },
        { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: data.image } }] },
      ];
      const r = parseJSON<VerifyResult>(await callAI(messages, true));
      r.sideEffects = r.sideEffects ?? [];
      r.warnings = r.warnings ?? [];
      return r;
    }),
  );

/* ---------- Interactions ---------- */
export interface InteractionResult {
  summary: string;
  pairs: { a: string; b: string; severity: "none" | "minor" | "moderate" | "major"; description: string; advice: string }[];
  foodAdvice: string[];
}

export const checkInteractions = createServerFn({ method: "POST" })
  .validator((d) => z.object({ medicines: z.array(z.string().min(1).max(120)).min(2).max(15), conditions: z.array(z.string().max(120)).max(20), language: z.enum(["en", "ta", "hi", "te"]).optional() }).parse(d))
  .handler(({ data }) =>
    run(async () => {
      const prompt = `Check drug-drug interactions between: ${data.medicines.join(", ")}.
Patient conditions: ${data.conditions.join(", ") || "not specified"}.
Return ONLY JSON: {"summary":string,"pairs":[{"a":string,"b":string,"severity":"none"|"minor"|"moderate"|"major","description":string,"advice":string}],"foodAdvice":[string]}
Include every pair. Base severity on well-established pharmacology references. Keep language simple. Write "summary", "description", "advice" and "foodAdvice" in ${langName[data.language ?? "en"]} (keep medicine names and the severity values in English).`;
      return parseJSON<InteractionResult>(await callAI([{ role: "system", content: SAFETY }, { role: "user", content: prompt }], true));
    }),
  );

/* ---------- Report / prescription simplifier ---------- */
export interface SimplifyResult {
  title: string;
  summary: string;
  findings: { item: string; value: string; status: "normal" | "high" | "low" | "attention" | "info"; meaning: string }[];
  terms: { term: string; meaning: string }[];
  nextSteps: string[];
  questionsForDoctor: string[];
}

export const simplifyDocument = createServerFn({ method: "POST" })
  .validator((d) => z.object({ text: z.string().max(20000).optional(), image: imageSchema.optional(), language: z.enum(["en", "ta", "hi", "te"]) }).parse(d))
  .handler(({ data }) =>
    run(async () => {
      if (!data.text?.trim() && !data.image) throw new AIError("Please paste text or upload a document.");
      const prompt = `Explain this medical document (lab report, prescription, discharge summary or scan report) to a patient in simple ${langName[data.language]}.
Return ONLY JSON: {"title":string,"summary":string,"findings":[{"item":string,"value":string,"status":"normal"|"high"|"low"|"attention"|"info","meaning":string}],"terms":[{"term":string,"meaning":string}],"nextSteps":[string],"questionsForDoctor":[string]}
All text values in ${langName[data.language]} (keep medicine names and numbers as written).${data.text ? `\n\nDocument text:\n${data.text}` : ""}`;
      const content: AIMessage["content"] = data.image
        ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: data.image } }]
        : prompt;
      return parseJSON<SimplifyResult>(await callAI([{ role: "system", content: SAFETY }, { role: "user", content }], true));
    }),
  );

/* ---------- Assistant chat ---------- */
export const askAssistant = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(30),
        context: z.string().max(6000),
        language: z.enum(["en", "ta", "hi", "te"]),
        short: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(({ data }) =>
    run(async () => {
      const sys = `${SAFETY}
Reply in ${langName[data.language]}. ${data.short ? "Keep replies to 1-3 short spoken sentences with no markdown." : "Use short paragraphs or bullet lists."}
For emergencies (chest pain, breathing difficulty, overdose, severe allergy) tell the user to call 108 / emergency services immediately.
Patient information (use it to answer personal questions such as "what is my next medicine"):
${data.context}`;
      const reply = await callAI([{ role: "system", content: sys }, ...data.messages], false);
      return { reply };
    }),
  );

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, RotateCcw, Save, ScanLine, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Disclaimer, MedicalDisclaimer, PageHeader, PipelineView, SectionCard, UploadZone, useAIProgress } from "@/components/common";
import { analyzePrescription, type RxAnalysis } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/useT";
import type { RxMedicine } from "@/lib/types";

export const Route = createFileRoute("/_shell/scan")({
  head: () => seo("Scan Prescription", "Upload or photograph a prescription and let AI extract every medicine, dose and timing."),
  component: ScanPage,
});

const STEPS = ["Uploading image securely", "Reading handwriting and printed text", "Identifying medicines and strengths", "Building dose schedule", "Checking for warnings"];

const blankMed = (): RxMedicine => ({ name: "", strength: "", form: "Tablet", dosage: "1 tablet", frequency: "Once daily", times: ["09:00"], timing: "After food", durationDays: 0, purpose: "", notes: "" });

function ScanPage() {
  const analyze = useServerFn(analyzePrescription);
  const { addPrescription } = useStore();
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<RxAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addMeds, setAddMeds] = useState(true);
  const t = useT();
  const progress = useAIProgress(STEPS.map((x) => t(x)));

  const start = async () => {
    if (!image) return;
    setError(null);
    setResult(null);
    const res = await progress.run(() => analyze({ data: { image } }));
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    if (!res.data.isPrescription) {
      setError(res.data.reason || t("This image does not look like a prescription. Please upload a clear photo of a prescription."));
      return;
    }
    setResult(res.data);
    toast.success(t("Found {n} medicine(s). Please review before saving.", { n: res.data.medicines.length }));
  };

  const updateMed = (i: number, p: Partial<RxMedicine>) =>
    setResult((r) => (r ? { ...r, medicines: r.medicines.map((m, j) => (j === i ? { ...m, ...p } : m)) } : r));

  const save = () => {
    if (!result) return;
    const meds = result.medicines.filter((m) => m.name.trim());
    if (!meds.length) { toast.error(t("Add at least one medicine before saving.")); return; }
    const id = addPrescription(
      { doctor: result.doctor, clinic: result.clinic, date: result.date, patient: result.patient, diagnosis: result.diagnosis, medicines: meds, advice: result.advice, warnings: result.warnings, rawText: result.rawText, ...(image ? { image } : {}) },
      addMeds,
    );
    toast.success(addMeds ? t("Prescription saved and reminders created.") : t("Prescription saved."));
    navigate({ to: "/prescriptions" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("scan")} subtitle={t("Upload a clear photo of a handwritten or printed prescription. AI extracts each medicine, dose, timing and duration.")}>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("1. Upload prescription")}>
          <UploadZone label={t("Drop prescription image here")} hint={t("JPG, PNG or WEBP up to 10 MB. Keep the full page in frame and well lit.")} preview={image} onFile={(d) => { setImage(d); setResult(null); setError(null); progress.reset(); }} />
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={!image || progress.running} onClick={start}>
              <ScanLine className="size-4" /> {progress.running ? t("Analysing...") : t("Analyse Prescription")}
            </Button>
            {image ? (
              <Button variant="outline" onClick={() => { setImage(null); setResult(null); setError(null); progress.reset(); }}>
                <RotateCcw className="size-4" />
              </Button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title={t("2. AI analysis")}>
          {progress.index >= 0 ? <PipelineView steps={STEPS.map((x) => t(x))} index={progress.index} running={progress.running} /> : (
            <p className="text-sm text-muted-foreground">{t("Results will appear here after you upload and analyse a prescription.")}</p>
          )}
          {error ? (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" /> {error}
            </p>
          ) : null}
          {result ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {([["Doctor", result.doctor], ["Clinic", result.clinic], ["Date", result.date], ["Patient", result.patient], ["Diagnosis", result.diagnosis], ["Legibility", `${result.confidence}%`]] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{t(k)}</dt>
                  <dd className="font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </SectionCard>
      </div>

      {result ? (
        <SectionCard title={t("3. Review medicines")} description={t("Correct anything the AI misread, then save.")} className="mt-6">
          {result.warnings.length ? (
            <div className="mb-4 space-y-2">
              {result.warnings.map((w, i) => <Disclaimer key={i} tone="warning">{w}</Disclaimer>)}
            </div>
          ) : null}
          <div className="space-y-4">
            {result.medicines.map((m, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label={t("Medicine")} value={m.name} onChange={(v) => updateMed(i, { name: v })} />
                  <Field label={t("Strength")} value={m.strength} onChange={(v) => updateMed(i, { strength: v })} />
                  <Field label={t("Dose")} value={m.dosage} onChange={(v) => updateMed(i, { dosage: v })} />
                  <Field label={t("Frequency")} value={m.frequency} onChange={(v) => updateMed(i, { frequency: v })} />
                  <Field label={t("Times (comma separated)")} value={m.times.join(", ")} onChange={(v) => updateMed(i, { times: v.split(",").map((x) => x.trim()).filter((x) => /^\d{2}:\d{2}$/.test(x)) })} />
                  <Field label={t("When")} value={m.timing} onChange={(v) => updateMed(i, { timing: v })} />
                  <Field label={t("Duration (days, 0 = ongoing)")} value={String(m.durationDays)} onChange={(v) => updateMed(i, { durationDays: Number(v) || 0 })} />
                  <Field label={t("Used for")} value={m.purpose} onChange={(v) => updateMed(i, { purpose: v })} />
                </div>
                {m.notes ? <p className="mt-2 text-xs text-muted-foreground">{t("Note")}: {m.notes}</p> : null}
                <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => setResult({ ...result, medicines: result.medicines.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4" /> {t("Remove")}
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-4" onClick={() => setResult({ ...result, medicines: [...result.medicines, blankMed()] })}>
            <Plus className="size-4" /> {t("Add medicine")}
          </Button>
          {result.advice ? <p className="mt-4 text-sm"><span className="font-semibold">{t("Doctor's advice")}:</span> {result.advice}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={addMeds} onCheckedChange={(v) => setAddMeds(!!v)} /> {t("Add these to my medications and create reminders")}
            </label>
            <Button onClick={save}><Save className="size-4" /> {t("Save prescription")}</Button>
          </div>
        </SectionCard>
      ) : null}
      <MedicalDisclaimer />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <Input className="mt-1 text-foreground" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

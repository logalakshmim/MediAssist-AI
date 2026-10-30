import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, HelpCircle, RotateCcw, ShieldCheck, Square, Volume2, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicalDisclaimer, PageHeader, PipelineView, SectionCard, UploadZone, useAIProgress } from "@/components/common";
import { verifyMedicine, type VerifyResult } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/verify")({
  head: () => seo("Medicine Verification", "Photograph a medicine strip or bottle and check it matches your prescription and is not expired."),
  component: VerifyPage,
});

const STEPS = ["Uploading photo", "Reading label, strength and expiry", "Identifying active ingredient", "Comparing with your prescriptions", "Preparing safety summary"];

const verdictUI = {
  match: { icon: CheckCircle2, title: "Correct medicine — matches your prescription", spoken: "Correct medicine. This matches your prescription. You can take it as prescribed.", tone: "border-success/40 bg-success/10 text-success" },
  mismatch: { icon: XCircle, title: "Wrong medicine — does NOT match", spoken: "Wrong medicine. It does not match your prescription. Do not take it. Please check with your pharmacist.", tone: "border-destructive/40 bg-destructive/10 text-destructive" },
  not_prescribed: { icon: AlertTriangle, title: "Not in your prescribed medicines", spoken: "Warning. This medicine is not in your prescription. Do not take it without asking your doctor.", tone: "border-warning/50 bg-warning/15 text-foreground" },
  expired: { icon: XCircle, title: "Expired — do not use", spoken: "Wrong medicine. This medicine has expired. Do not use it.", tone: "border-destructive/40 bg-destructive/10 text-destructive" },
  unclear: { icon: HelpCircle, title: "Could not read clearly — retake photo", spoken: "The label could not be read clearly. Please take the photo again.", tone: "border-info/30 bg-info/10 text-info" },
} as const;

function VerifyPage() {
  const verify = useServerFn(verifyMedicine);
  const t = useT();
  const { medications, language, addVerification, addHistory, pushNotification } = useStore();
  const [image, setImage] = useState<string | null>(null);
  const [target, setTarget] = useState<string>("any");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const progress = useAIProgress(STEPS.map((x) => t(x)));
  const expected = medications.filter((m) => m.active).map((m) => `${m.name} ${m.strength}`.trim());

  const sayVerdict = (r: VerifyResult) => {
    const ui = verdictUI[r.verdict] ?? verdictUI.unclear;
    const text = `${t(ui.spoken)} ${r.name ? `${t("Medicine")}: ${r.name} ${r.strength}.` : ""}`;
    setSpeaking(true);
    if (!speak(text, language, () => setSpeaking(false))) {
      setSpeaking(false);
      toast.error(t("Voice output is not supported in this browser."));
    }
  };

  const reset = () => { stopSpeaking(); setSpeaking(false); setResult(null); setError(null); progress.reset(); };

  const start = async () => {
    if (!image) return;
    reset();
    const res = await progress.run(() => verify({ data: { image, expected, language, target: target === "any" ? undefined : target } }));
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      speak(t("Verification failed. Please try again."), language);
      return;
    }
    const r = res.data;
    if (!r.identified) {
      const msg = r.explanation || t("No medicine could be identified in this photo. Please retake it with the label clearly visible.");
      setError(msg);
      speak(t("No medicine could be identified in this photo. Please retake it with the label clearly visible."), language);
      return;
    }
    setResult(r);
    sayVerdict(r);
    const label = `${r.name} ${r.strength}`.trim();
    const title = t((verdictUI[r.verdict] ?? verdictUI.unclear).title);
    addVerification({ name: label, verdict: r.verdict });
    addHistory({ date: new Date().toISOString().slice(0, 10), category: "Verification", title: `${t("Verified")} ${label}`, detail: title });
    if (r.verdict !== "match") pushNotification({ kind: "warning", message: `${label}: ${title}` });
  };

  const v = result ? verdictUI[result.verdict] ?? verdictUI.unclear : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("verify")} subtitle={t("Take a photo of the medicine you received. The app reads the label, checks it against your prescriptions, strength and expiry date, and reads the result aloud.")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("Medicine photo")}>
          <UploadZone label={t("Upload strip, bottle or box photo")} hint={t("Make sure the name, strength and expiry date are readable.")} preview={image} onFile={(d) => { setImage(d); reset(); }} />
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">{t("Which medicine should this be?")}</p>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger aria-label={t("Which medicine should this be?")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("Check against all my medicines")}</SelectItem>
                {expected.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            {expected.length === 0 ? <p className="text-xs text-muted-foreground">{t("You have no medicines saved yet — the app will still identify the medicine and check its expiry.")}</p> : null}
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={!image || progress.running} onClick={start}>
              <ShieldCheck className="size-4" /> {progress.running ? t("Verifying...") : t("Verify Medicine")}
            </Button>
            {image ? <Button variant="outline" aria-label={t("Start over")} onClick={() => { setImage(null); reset(); }}><RotateCcw className="size-4" /></Button> : null}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Volume2 className="size-4 text-accent" /> {t("The result is spoken aloud automatically for visually impaired users.")}</p>
        </SectionCard>

        <SectionCard title={t("Verification result")}>
          <div aria-live="assertive" className="sr-only">{result && v ? t(v.spoken) : error ?? ""}</div>
          {progress.index >= 0 && !result ? <PipelineView steps={STEPS.map((x) => t(x))} index={progress.index} running={progress.running} /> : null}
          {progress.index < 0 && !result && !error ? <p className="text-sm text-muted-foreground">{t("Upload a medicine photo to begin.")}</p> : null}
          {error ? <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" /> {error}</p> : null}
          {result && v ? (
            <div className="space-y-4">
              <div className={cn("flex items-start gap-3 rounded-xl border-2 p-5", v.tone)}>
                <v.icon className="size-10 shrink-0" />
                <div className="flex-1">
                  <p className="text-lg font-bold">{t(v.title)}</p>
                  {result.matchedWith ? <p className="text-sm">{t("Matched with")}: {result.matchedWith}</p> : null}
                  <p className="mt-1 text-sm text-foreground/80">{result.explanation}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {canSpeak() ? (
                  speaking ? (
                    <Button variant="outline" onClick={() => { stopSpeaking(); setSpeaking(false); }}><Square className="size-4" /> {t("Stop voice")}</Button>
                  ) : (
                    <Button variant="outline" onClick={() => sayVerdict(result)}><Volume2 className="size-4" /> {t("Hear result again")}</Button>
                  )
                ) : <p className="text-xs text-muted-foreground">{t("Voice output is not supported in this browser.")}</p>}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {([["Brand / name", result.name], ["Generic", result.genericName], ["Strength", result.strength], ["Form", result.form], ["Manufacturer", result.manufacturer], ["Batch", result.batch], ["Expiry", result.expiry], ["Confidence", `${result.confidence}%`]] as const).map(([k, val]) => (
                  <div key={k}><dt className="text-xs text-muted-foreground">{t(k)}</dt><dd className="font-medium">{val || "—"}</dd></div>
                ))}
              </dl>
              {result.uses ? <p className="text-sm"><span className="font-semibold">{t("Used for")}:</span> {result.uses}</p> : null}
              {result.sideEffects.length ? <p className="text-sm"><span className="font-semibold">{t("Common side effects")}:</span> {result.sideEffects.join(", ")}</p> : null}
              {result.storage ? <p className="text-sm"><span className="font-semibold">{t("Storage")}:</span> {result.storage}</p> : null}
              {result.warnings.map((w, i) => <p key={i} className="flex gap-2 text-sm"><AlertTriangle className="size-4 shrink-0 text-warning" />{w}</p>)}
            </div>
          ) : null}
        </SectionCard>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

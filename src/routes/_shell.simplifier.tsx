import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, FileText, Save, Square, Volume2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MedicalDisclaimer, PageHeader, PipelineView, SectionCard, UploadZone, useAIProgress } from "@/components/common";
import { simplifyDocument, type SimplifyResult } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { speak, stopSpeaking } from "@/lib/speech";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/simplifier")({
  head: () => seo("Report Simplifier", "Understand lab reports and prescriptions in simple words."),
  component: Page,
});

const STEPS = ["Reading the document", "Finding test values and terms", "Explaining in simple words", "Preparing questions for your doctor"];
const tone = { normal: "text-success", high: "text-destructive", low: "text-warning", attention: "text-warning", info: "text-info" } as const;

function Page() {
  const t = useT();
  const s = useStore();
  const simplify = useServerFn(simplifyDocument);
  const [mode, setMode] = useState<"upload" | "text">("upload");
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<SimplifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const progress = useAIProgress(STEPS.map((x) => t(x)));

  const run = async () => {
    if (mode === "upload" ? !image : !text.trim()) { toast.error(t("Please paste text or upload a document.")); return; }
    setError(null); setResult(null);
    const res = await progress.run(() => simplify({ data: { language: s.language, ...(mode === "upload" && image ? { image } : { text }) } }));
    if (!res.ok) { setError(res.error); toast.error(res.error); return; }
    setResult(res.data);
  };

  const saveRecord = () => {
    if (!image) return;
    s.addRecord({ name: fileName || result?.title || t("Medical document"), type: "Lab Report", format: image.startsWith("data:application/pdf") ? "PDF" : "Image", date: new Date().toISOString().slice(0, 10), provider: "", file: image });
    toast.success(t("Saved to Health Records."));
  };

  const listen = () => {
    if (!result) return;
    setSpeaking(true);
    speak(`${result.title}. ${result.summary}. ${result.nextSteps.join(". ")}`, s.language, () => setSpeaking(false));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("simplifier")} subtitle={t("Upload a lab report, prescription or discharge summary and get a simple explanation in your language.")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("Document")}>
          <div className="mb-4 inline-flex rounded-lg border border-border p-1">
            {(["upload", "text"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {m === "upload" ? t("Upload file") : t("Paste text")}
              </button>
            ))}
          </div>
          {mode === "upload" ? (
            <UploadZone label={t("Upload report image or PDF")} hint={t("JPG, PNG or PDF up to 10 MB.")} accept="image/*,application/pdf" preview={image} onFile={(d, n) => { setImage(d); setFileName(n); setResult(null); }} />
          ) : (
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Paste the report text here...")} aria-label={t("Paste text")} />
          )}
          <Button className="mt-4 w-full" disabled={progress.running} onClick={run}>
            <FileText className="size-4" /> {progress.running ? t("Explaining...") : t("Explain in simple words")}
          </Button>
        </SectionCard>
        <SectionCard title={t("Simple explanation")}>
          {progress.index >= 0 && !result ? <PipelineView steps={STEPS.map((x) => t(x))} index={progress.index} running={progress.running} /> : null}
          {progress.index < 0 && !result && !error ? <p className="text-sm text-muted-foreground">{t("The explanation will appear here.")}</p> : null}
          {error ? <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" />{error}</p> : null}
          {result ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-base font-bold">{result.title}</p>
                <p className="mt-1">{result.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {speaking ? <Button size="sm" variant="outline" onClick={() => { stopSpeaking(); setSpeaking(false); }}><Square className="size-4" /> {t("Stop voice")}</Button>
                  : <Button size="sm" variant="outline" onClick={listen}><Volume2 className="size-4" /> {t("Read aloud")}</Button>}
                {mode === "upload" && image ? <Button size="sm" variant="outline" onClick={saveRecord}><Save className="size-4" /> {t("Save to Health Records")}</Button> : null}
              </div>
              {result.findings.length ? (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {result.findings.map((f, i) => (
                    <li key={i} className="p-3">
                      <p className="flex justify-between gap-2 font-semibold"><span>{f.item}</span><span className={tone[f.status] ?? ""}>{f.value}</span></p>
                      <p className="text-muted-foreground">{f.meaning}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.terms.length ? <div><p className="font-semibold">{t("Medical terms explained")}</p><ul className="mt-1 space-y-1">{result.terms.map((x, i) => <li key={i}><b>{x.term}</b>: {x.meaning}</li>)}</ul></div> : null}
              {result.nextSteps.length ? <div><p className="font-semibold">{t("Next steps")}</p><ul className="mt-1 list-disc pl-5">{result.nextSteps.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
              {result.questionsForDoctor.length ? <div><p className="font-semibold">{t("Questions to ask your doctor")}</p><ul className="mt-1 list-disc pl-5">{result.questionsForDoctor.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
            </div>
          ) : null}
        </SectionCard>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

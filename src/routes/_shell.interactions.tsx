import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer, MedicalDisclaimer, PageHeader, PipelineView, SectionCard, useAIProgress } from "@/components/common";
import { checkInteractions, type InteractionResult } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/interactions")({
  head: () => seo("Drug Interaction Checker", "Check whether your medicines are safe to take together."),
  component: Page,
});

const STEPS = ["Collecting medicine list", "Matching active ingredients", "Checking each medicine pair", "Considering your conditions", "Preparing advice"];
const sevTone = {
  none: "border-success/30 bg-success/8",
  minor: "border-info/30 bg-info/8",
  moderate: "border-warning/50 bg-warning/12",
  major: "border-destructive/40 bg-destructive/10",
} as const;
const sevLabel = { none: "No interaction", minor: "Minor", moderate: "Moderate", major: "Major" } as const;

function Page() {
  const t = useT();
  const s = useStore();
  const check = useServerFn(checkInteractions);
  const [list, setList] = useState<string[]>(() => s.medications.filter((m) => m.active).map((m) => `${m.name} ${m.strength}`.trim()));
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useAIProgress(STEPS.map((x) => t(x)));

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) { toast.info(t("Already in the list.")); return; }
    setList([...list, v]);
    setDraft("");
  };

  const run = async () => {
    if (list.length < 2) { toast.error(t("Add at least two medicines to check.")); return; }
    setError(null); setResult(null);
    const res = await progress.run(() => check({ data: { medicines: list, conditions: s.user.conditions, language: s.language } }));
    if (!res.ok) { setError(res.error); toast.error(res.error); return; }
    setResult(res.data);
    const major = res.data.pairs.filter((p) => p.severity === "major");
    if (major.length) s.pushNotification({ kind: "warning", message: `${t("Major interaction")}: ${major.map((p) => `${p.a} + ${p.b}`).join(", ")}` });
    else toast.success(t("Interaction check complete."));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("interactions")} subtitle={t("Check whether your medicines are safe to take together. Your saved medicines are added automatically.")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("Medicines to check")}>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("Type a medicine name, e.g. Aspirin 75mg")} aria-label={t("Medicine")} />
            <Button type="submit" variant="outline"><Plus className="size-4" /> {t("Add")}</Button>
          </form>
          <ul className="mt-4 flex flex-wrap gap-2">
            {list.map((m) => (
              <li key={m} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm">
                {m}
                <button aria-label={`${t("Remove")} ${m}`} onClick={() => setList(list.filter((x) => x !== m))}><X className="size-3.5" /></button>
              </li>
            ))}
            {list.length === 0 ? <li className="text-sm text-muted-foreground">{t("No medicines added yet.")}</li> : null}
          </ul>
          {s.user.conditions.length ? <p className="mt-4 text-xs text-muted-foreground">{t("Your conditions")}: {s.user.conditions.join(", ")}</p> : null}
          <Button className="mt-4 w-full" disabled={progress.running} onClick={run}>
            <Search className="size-4" /> {progress.running ? t("Checking...") : t("Check Interactions")}
          </Button>
        </SectionCard>
        <SectionCard title={t("Results")}>
          {progress.index >= 0 && !result ? <PipelineView steps={STEPS.map((x) => t(x))} index={progress.index} running={progress.running} /> : null}
          {progress.index < 0 && !result && !error ? <p className="text-sm text-muted-foreground">{t("Add medicines and press Check Interactions.")}</p> : null}
          {error ? <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" />{error}</p> : null}
          {result ? (
            <div className="space-y-3">
              <p className="text-sm">{result.summary}</p>
              {result.pairs.map((p, i) => (
                <div key={i} className={cn("rounded-xl border p-4", sevTone[p.severity] ?? sevTone.minor)}>
                  <p className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                    <span>{p.a} + {p.b}</span>
                    <span className="rounded-full bg-card px-2.5 py-0.5 text-xs">{t(sevLabel[p.severity] ?? p.severity)}</span>
                  </p>
                  <p className="mt-1 text-sm">{p.description}</p>
                  {p.advice ? <p className="mt-1 text-sm text-muted-foreground">{p.advice}</p> : null}
                </div>
              ))}
              {result.foodAdvice?.length ? (
                <div>
                  <p className="text-sm font-semibold">{t("Food and lifestyle advice")}</p>
                  <ul className="mt-1 list-disc pl-5 text-sm">{result.foodAdvice.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              ) : null}
              <Disclaimer tone="warning">{t("Never stop or change a medicine on your own. Discuss any interaction with your doctor or pharmacist.")}</Disclaimer>
            </div>
          ) : null}
        </SectionCard>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

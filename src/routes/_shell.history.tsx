import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, SectionCard } from "@/components/common";
import { todayISO, useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import type { HistoryEvent } from "@/lib/types";

export const Route = createFileRoute("/_shell/history")({
  head: () => seo("Medical History", "Your timeline of conditions, consultations, prescriptions and verifications."),
  component: Page,
});

const CATS: HistoryEvent["category"][] = ["Condition", "Consultation", "Procedure", "Previous Medication", "Allergy", "Prescription", "Verification"];

function Page() {
  const t = useT();
  const s = useStore();
  const [filter, setFilter] = useState<string>("all");
  const [d, setD] = useState({ date: todayISO(), category: "Consultation" as HistoryEvent["category"], title: "", detail: "" });
  const list = s.history.filter((h) => filter === "all" || h.category === filter).sort((a, b) => b.date.localeCompare(a.date));

  const add = () => {
    if (!d.title.trim()) { toast.error(t("Please enter a title.")); return; }
    s.addHistory(d);
    toast.success(t("Added to your history."));
    setD({ ...d, title: "", detail: "" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("history")} subtitle={t("Your timeline of conditions, consultations, prescriptions and verifications.")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title={t("Add an event")}>
          <div className="grid gap-3">
            <Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} aria-label={t("Date")} />
            <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v as HistoryEvent["category"] })}>
              <SelectTrigger aria-label={t("Type")}><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder={t("Title")} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            <Input placeholder={t("Details (optional)")} value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} />
            <Button onClick={add}><Plus className="size-4" /> {t("Add")}</Button>
          </div>
        </SectionCard>
        <SectionCard title={t("Timeline")} className="lg:col-span-2" action={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44" aria-label={t("Filter")}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("All")}</SelectItem>{CATS.map((c) => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}</SelectContent>
          </Select>
        }>
          {list.length === 0 ? <EmptyState title={t("No history yet")} description={t("Events appear as you use the app.")} /> : (
            <ol className="relative space-y-4 border-l-2 border-accent/30 pl-5">
              {list.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-accent" />
                  <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{h.date} · {t(h.category)}</p>
                      <p className="font-semibold">{h.title}</p>
                      {h.detail ? <p className="text-xs text-muted-foreground">{h.detail}</p> : null}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={t("Delete")} onClick={() => s.removeHistory(h.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ScanLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionCard } from "@/components/common";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/prescriptions")({
  head: () => seo("Prescriptions", "All prescriptions you have scanned and saved."),
  component: Page,
});

function Page() {
  const t = useT();
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("prescriptions")} subtitle={t("All prescriptions you have scanned and saved.")}>
        <Button asChild><Link to="/scan"><ScanLine className="size-4" /> {t("scan")}</Link></Button>
      </PageHeader>
      <SectionCard>
        {s.prescriptions.length === 0 ? (
          <EmptyState title={t("No prescriptions yet")} description={t("Scan your first prescription.")} action={<Button asChild><Link to="/scan">{t("scan")}</Link></Button>} />
        ) : (
          <ul className="space-y-3">
            {s.prescriptions.map((r) => (
              <li key={r.id} className="rounded-xl border border-border">
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                  <span className="flex-1">
                    <span className="block font-semibold">{r.doctor || t("Doctor")} {r.clinic ? `· ${r.clinic}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{r.date || r.createdAt.slice(0, 10)} · {r.medicines.length} {t("medicines")}</span>
                  </span>
                  <ChevronDown className={cn("size-4 transition-transform", open === r.id && "rotate-180")} />
                </button>
                {open === r.id ? (
                  <div className="space-y-3 border-t border-border p-4 text-sm">
                    {r.diagnosis ? <p><b>{t("Diagnosis")}:</b> {r.diagnosis}</p> : null}
                    <ul className="divide-y divide-border rounded-lg bg-muted/40">
                      {r.medicines.map((m, i) => <li key={i} className="p-3"><b>{m.name} {m.strength}</b><span className="block text-xs text-muted-foreground">{m.dosage} · {m.frequency} · {m.times.join(", ")} · {m.timing}{m.durationDays ? ` · ${m.durationDays} ${t("days")}` : ""}</span></li>)}
                    </ul>
                    {r.advice ? <p><b>{t("Doctor's advice")}:</b> {r.advice}</p> : null}
                    {r.image && r.image.startsWith("data:image") ? <img src={r.image} alt={t("prescriptions")} className="max-h-64 rounded-lg border border-border" /> : null}
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm(t("Delete this prescription?"))) { s.removePrescription(r.id); toast.success(t("Prescription deleted.")); } }}><Trash2 className="size-4" /> {t("Delete")}</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

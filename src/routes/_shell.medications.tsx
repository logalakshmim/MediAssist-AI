import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, MedicalDisclaimer, PageHeader, SectionCard } from "@/components/common";
import { todayISO, useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import type { Medication } from "@/lib/types";

export const Route = createFileRoute("/_shell/medications")({
  head: () => seo("Medications", "Add, edit and manage your active and past medicines."),
  component: Page,
});

type Draft = Omit<Medication, "id">;
const blank = (): Draft => ({ name: "", strength: "", form: "Tablet", dosage: "1 tablet", frequency: "Once daily", times: ["09:00"], instructions: "After food", durationDays: 0, startDate: todayISO(), purpose: "", reminderOn: true, active: true });

function Page() {
  const t = useT();
  const s = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id?: string; d: Draft } | null>(null);
  const list = s.medications.filter((m) => `${m.name} ${m.purpose}`.toLowerCase().includes(query.toLowerCase()));

  const save = () => {
    if (!editing) return;
    const d = { ...editing.d, times: editing.d.times.filter((x) => /^\d{2}:\d{2}$/.test(x)) };
    if (!d.name.trim()) { toast.error(t("Please enter the medicine name.")); return; }
    if (!d.times.length) { toast.error(t("Enter at least one time in HH:MM format.")); return; }
    if (editing.id) s.updateMedication(editing.id, d); else s.addMedication(d);
    toast.success(editing.id ? t("Medicine updated.") : t("Medicine added and reminders created."));
    setEditing(null);
  };
  const set = (p: Partial<Draft>) => setEditing((e) => (e ? { ...e, d: { ...e.d, ...p } } : e));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("medications")} subtitle={t("Your active and past medicines. Reminders are created from the times you set.")}>
        <Button onClick={() => setEditing({ d: blank() })}><Plus className="size-4" /> {t("Add medicine")}</Button>
      </PageHeader>
      <SectionCard>
        <Input className="mb-4 max-w-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search medicines...")} aria-label={t("Search medicines...")} />
        {list.length === 0 ? (
          <EmptyState title={t("No medicines yet")} description={t("Scan a prescription or add a medicine manually.")} action={<Button asChild><Link to="/scan">{t("scan")}</Link></Button>} />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1">
                  <span className="block font-semibold">{m.name} {m.strength} {!m.active ? <span className="text-xs font-normal text-muted-foreground">({t("Stopped")})</span> : null}</span>
                  <span className="text-xs text-muted-foreground">{m.dosage} · {t(m.frequency)} · {m.times.join(", ")} · {t(m.instructions)}{m.purpose ? ` · ${m.purpose}` : ""}</span>
                </span>
                <Button variant="outline" size="sm" onClick={() => { s.updateMedication(m.id, { active: !m.active }); toast.success(m.active ? t("Medicine stopped.") : t("Medicine resumed.")); }}>{m.active ? t("Stop") : t("Resume")}</Button>
                <Button variant="ghost" size="icon" aria-label={t("Edit")} onClick={() => { const { id, ...d } = m; setEditing({ id, d }); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={t("Delete")} onClick={() => { if (confirm(t("Delete this medicine?"))) { s.removeMedication(m.id); toast.success(t("Medicine deleted.")); } }}><Trash2 className="size-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? t("Edit medicine") : t("Add medicine")}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={t("Medicine")} v={editing.d.name} on={(v) => set({ name: v })} />
              <F label={t("Strength")} v={editing.d.strength} on={(v) => set({ strength: v })} />
              <F label={t("Form")} v={editing.d.form} on={(v) => set({ form: v })} />
              <F label={t("Dose")} v={editing.d.dosage} on={(v) => set({ dosage: v })} />
              <F label={t("Frequency")} v={editing.d.frequency} on={(v) => set({ frequency: v })} />
              <F label={t("Times (comma separated)")} v={editing.d.times.join(", ")} on={(v) => set({ times: v.split(",").map((x) => x.trim()) })} />
              <F label={t("When")} v={editing.d.instructions} on={(v) => set({ instructions: v })} />
              <F label={t("Duration (days, 0 = ongoing)")} v={String(editing.d.durationDays)} on={(v) => set({ durationDays: Number(v) || 0 })} />
              <F label={t("Start date")} type="date" v={editing.d.startDate} on={(v) => set({ startDate: v })} />
              <F label={t("Used for")} v={editing.d.purpose} on={(v) => set({ purpose: v })} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={editing.d.reminderOn} onChange={(e) => set({ reminderOn: e.target.checked })} /> {t("Remind me for each dose")}</label>
            </div>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>{t("Cancel")}</Button><Button onClick={save}>{t("Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <MedicalDisclaimer />
    </div>
  );
}

function F({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <Input type={type} className="mt-1 text-foreground" value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}

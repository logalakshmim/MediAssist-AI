import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BellOff, BellRing, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState, PageHeader, SectionCard, StatusPill } from "@/components/common";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_shell/reminders")({
  head: () => seo("Smart Reminders", "Today's dose schedule with alerts when each dose is due."),
  component: Page,
});

function Page() {
  const t = useT();
  const s = useStore();
  const taken = s.doses.filter((d) => d.status === "taken").length;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("reminders")} subtitle={t("Today's dose schedule. You get an alert when each dose is due.")}>
        <Button variant="outline" onClick={() => { if ("Notification" in window) Notification.requestPermission().then((p) => toast.info(p === "granted" ? t("Browser notifications enabled.") : t("Browser notifications are blocked."))); s.updateSettings({ browserNotifications: true }); }}>
          <BellRing className="size-4" /> {t("Enable browser alerts")}
        </Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title={t("todayMeds")} description={`${taken}/${s.doses.length} ${t("taken")}`} className="lg:col-span-2">
          {s.doses.length === 0 ? (
            <EmptyState title={t("No doses today")} description={t("Add medicines to get reminders.")} action={<Button asChild><Link to="/medications">{t("Add medicine")}</Link></Button>} />
          ) : (
            <ul className="divide-y divide-border">
              {s.doses.map((d) => (
                <li key={d.key} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-14 font-mono font-semibold">{d.time}</span>
                  <span className="flex-1"><span className="block font-medium">{d.medication}</span><span className="text-xs text-muted-foreground">{d.dosage}</span></span>
                  <StatusPill status={d.status} />
                  <Button size="sm" disabled={d.status === "taken"} onClick={() => { s.setDoseStatus(d.key, "taken"); toast.success(`${d.medication}: ${t("Taken")}`); }}><Check className="size-4" /> {t("Taken")}</Button>
                  <Button size="sm" variant="outline" disabled={d.status === "skipped"} onClick={() => { s.setDoseStatus(d.key, "skipped"); toast.info(`${d.medication}: ${t("Skipped")}`); }}><SkipForward className="size-4" /> {t("Skip")}</Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title={t("Reminder settings")}>
          <ul className="space-y-3">
            {s.medications.filter((m) => m.active).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{m.name} {m.strength}<span className="block text-xs text-muted-foreground">{m.times.join(", ")}</span></span>
                <Switch checked={m.reminderOn} aria-label={`${t("Reminder")} ${m.name}`} onCheckedChange={(v) => s.updateMedication(m.id, { reminderOn: v })} />
              </li>
            ))}
            {s.medications.filter((m) => m.active).length === 0 ? <li className="flex items-center gap-2 text-sm text-muted-foreground"><BellOff className="size-4" /> {t("No active medicines.")}</li> : null}
          </ul>
          <label className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
            {t("Dose reminders")}
            <Switch checked={s.settings.doseReminders} onCheckedChange={(v) => s.updateSettings({ doseReminders: v })} />
          </label>
        </SectionCard>
      </div>
    </div>
  );
}

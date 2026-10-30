import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/components/common";
import { languages } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import type { Language } from "@/lib/types";

export const Route = createFileRoute("/_shell/settings")({
  head: () => seo("Settings", "Language, reminders, notifications and accessibility."),
  component: Page,
});

const TOGGLES = [
  ["doseReminders", "Dose reminders", "Show an alert when a dose is due."],
  ["interactionAlerts", "Interaction alerts", "Warn me about risky medicine combinations."],
  ["refillAlerts", "Refill alerts", "Remind me before a course ends."],
  ["browserNotifications", "Browser notifications", "Show system notifications even in another tab."],
  ["voiceReplies", "Voice replies", "Read assistant answers aloud."],
  ["largeText", "Large text", "Increase text size for easier reading."],
] as const;

function Page() {
  const t = useT();
  const s = useStore();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("settings")} subtitle={t("Language, reminders, notifications and accessibility.")} />
      <div className="space-y-6">
        <SectionCard title={t("language")}>
          <Select value={s.language} onValueChange={(v) => { s.setLanguage(v as Language); }}>
            <SelectTrigger className="max-w-xs" aria-label={t("language")}><SelectValue /></SelectTrigger>
            <SelectContent>{languages.map((l) => <SelectItem key={l.code} value={l.code}>{l.native} ({l.label})</SelectItem>)}</SelectContent>
          </Select>
        </SectionCard>
        <SectionCard title={t("Preferences")}>
          <ul className="divide-y divide-border">
            {TOGGLES.map(([k, label, hint]) => (
              <li key={k} className="flex items-center justify-between gap-4 py-3">
                <span><span className="block text-sm font-medium">{t(label)}</span><span className="text-xs text-muted-foreground">{t(hint)}</span></span>
                <Switch
                  checked={s.settings[k]}
                  aria-label={t(label)}
                  onCheckedChange={(v) => {
                    if (k === "browserNotifications" && v && "Notification" in window) Notification.requestPermission();
                    s.updateSettings({ [k]: v });
                    toast.success(t("Settings saved."));
                  }}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title={t("Your data")} description={t("All data is stored privately in this browser for your account.")}>
          <Button variant="destructive" onClick={() => { if (confirm(t("This deletes all your medicines, prescriptions and records. Continue?"))) { s.clearAllData(); toast.success(t("All data cleared.")); } }}>
            <Trash2 className="size-4" /> {t("Clear all my data")}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

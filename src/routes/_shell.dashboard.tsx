import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, ClipboardList, FileText, Pill, ScanLine, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState, MedicalDisclaimer, PageHeader, SectionCard, StatusPill } from "@/components/common";
import { useStore } from "@/lib/store";
import { translator } from "@/lib/i18n";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => seo("Dashboard", "Your medicines for today, adherence and health overview."),
  component: Dashboard,
});

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function Dashboard() {
  const s = useStore();
  const t = translator(s.language);
  const pending = s.doses.filter((d) => d.status === "pending");
  const stats = [
    { label: t("activeMeds"), value: s.medications.filter((m) => m.active).length, icon: Pill, to: "/medications" as const },
    { label: t("todayMeds"), value: s.doses.length, icon: Bell, to: "/reminders" as const },
    { label: t("pendingReminders"), value: pending.length, icon: AlertTriangle, to: "/reminders" as const },
    { label: t("prescriptions"), value: s.prescriptions.length, icon: ClipboardList, to: "/prescriptions" as const },
    { label: t("healthReports"), value: s.records.length, icon: FileText, to: "/records" as const },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={`${t(greetingKey())}, ${s.user.name.split(" ")[0]}`} subtitle={t("overview")}>
        <Button asChild>
          <Link to="/scan"><ScanLine className="size-4" /> {t("scan")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/verify"><ShieldCheck className="size-4" /> {t("verify")}</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((st) => (
          <Link key={st.label} to={st.to} className="card-surface p-4 transition-transform hover:-translate-y-0.5">
            <st.icon className="size-5 text-accent" />
            <p className="mt-3 text-2xl font-bold">{st.value}</p>
            <p className="text-xs text-muted-foreground">{st.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title={t("todayMeds")} className="lg:col-span-2" action={<Button asChild variant="ghost" size="sm"><Link to="/reminders">{t("View all")}</Link></Button>}>
          {s.doses.length === 0 ? (
            <EmptyState
              title={t("No doses scheduled today")}
              description={t("Scan a prescription or add a medicine to build your daily schedule.")}
              action={<Button asChild><Link to="/scan">{t("Scan prescription")}</Link></Button>}
            />
          ) : (
            <ul className="divide-y divide-border">
              {s.doses.map((d) => (
                <li key={d.key} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-14 font-mono text-sm font-semibold">{d.time}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{d.medication}</span>
                    <span className="text-xs text-muted-foreground">{d.dosage}</span>
                  </span>
                  <StatusPill status={d.status} />
                  {d.status !== "taken" ? (
                    <Button size="sm" onClick={() => s.setDoseStatus(d.key, "taken")}>{t("takeNow")}</Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t("7-day adherence")} description={`${t("Overall")} ${s.adherence}%`}>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={s.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} width={30} />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} name={t("Adherence %")} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("Recent notifications")}>
          {s.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No notifications yet.")}</p>
          ) : (
            <ul className="space-y-2">
              {s.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  {n.message}
                  <span className="block text-[11px] text-muted-foreground">{n.time}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title={t("Quick actions")}>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["/interactions", t("interactions")],
              ["/simplifier", t("simplifier")],
              ["/assistant", t("assistant")],
              ["/voice", t("voice")],
            ] as const).map(([to, label]) => (
              <Button key={to} asChild variant="outline" className="h-16">
                <Link to={to}>{label}</Link>
              </Button>
            ))}
          </div>
        </SectionCard>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

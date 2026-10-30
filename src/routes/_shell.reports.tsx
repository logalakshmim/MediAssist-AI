import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState, MedicalDisclaimer, PageHeader, SectionCard } from "@/components/common";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_shell/reports")({
  head: () => seo("Reports & Analytics", "Adherence, verification and medicine analytics."),
  component: Page,
});

const VERDICT_COLOR: Record<string, string> = { match: "var(--success)", mismatch: "var(--destructive)", expired: "var(--destructive)", not_prescribed: "var(--warning)", unclear: "var(--info)" };
const VERDICT_LABEL: Record<string, string> = { match: "Correct", mismatch: "Wrong", expired: "Expired", not_prescribed: "Not prescribed", unclear: "Unclear" };

function Page() {
  const t = useT();
  const s = useStore();
  const verdicts = Object.entries(s.verifications.reduce<Record<string, number>>((a, v) => ({ ...a, [v.verdict]: (a[v.verdict] ?? 0) + 1 }), {})).map(([k, n]) => ({ key: k, name: t(VERDICT_LABEL[k] ?? k), value: n }));
  const weekly = s.weekly.map((w) => ({ ...w, [t("Taken")]: w.taken, [t("Missed")]: w.missed }));
  const stats = [
    [t("7-day adherence"), `${s.adherence}%`],
    [t("activeMeds"), s.medications.filter((m) => m.active).length],
    [t("prescriptions"), s.prescriptions.length],
    [t("Medicines verified"), s.verifications.length],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("reports")} subtitle={t("Your adherence and medicine safety analytics.")}>
        <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> {t("Print report")}</Button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="card-surface p-4"><p className="text-2xl font-bold">{v}</p><p className="text-xs text-muted-foreground">{k}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("Doses taken vs missed (7 days)")}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={28} /><Tooltip /><Legend />
                <Bar dataKey={t("Taken")} fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t("Missed")} fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title={t("Verification results")}>
          {verdicts.length === 0 ? <EmptyState title={t("No verifications yet")} description={t("Verify a medicine to see results here.")} /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={verdicts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                    {verdicts.map((v) => <Cell key={v.key} fill={VERDICT_COLOR[v.key] ?? "var(--accent)"} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>
      <SectionCard title={t("Recent verifications")} className="mt-6">
        {s.verifications.length === 0 ? <p className="text-sm text-muted-foreground">{t("No verifications yet")}</p> : (
          <ul className="divide-y divide-border text-sm">{s.verifications.slice(0, 10).map((v) => <li key={v.id} className="flex justify-between py-2"><span>{v.name}</span><span className="text-muted-foreground">{t(VERDICT_LABEL[v.verdict] ?? v.verdict)} · {new Date(v.at).toLocaleDateString()}</span></li>)}</ul>
        )}
      </SectionCard>
      <MedicalDisclaimer />
    </div>
  );
}

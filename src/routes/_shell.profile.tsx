import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, SectionCard } from "@/components/common";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_shell/profile")({
  head: () => seo("Profile", "Your personal health details."),
  component: Page,
});

function Page() {
  const t = useT();
  const s = useStore();
  const [f, setF] = useState({ ...s.user, conditionsText: s.user.conditions.join(", "), allergiesText: s.user.allergies.join(", ") });
  useEffect(() => setF({ ...s.user, conditionsText: s.user.conditions.join(", "), allergiesText: s.user.allergies.join(", ") }), [s.user]);

  const save = () => {
    if (!f.name.trim()) { toast.error(t("Please enter your name.")); return; }
    const split = (x: string) => x.split(",").map((y) => y.trim()).filter(Boolean);
    s.updateUser({ name: f.name.trim(), age: f.age === "" ? "" : Number(f.age), gender: f.gender, bloodGroup: f.bloodGroup, phone: f.phone, emergencyContact: f.emergencyContact, conditions: split(f.conditionsText), allergies: split(f.allergiesText) });
    toast.success(t("Profile saved."));
  };

  const field = (label: string, key: "name" | "gender" | "bloodGroup" | "phone" | "emergencyContact" | "conditionsText" | "allergiesText", placeholder = "") => (
    <label className="block text-xs text-muted-foreground">
      {t(label)}
      <Input className="mt-1 text-foreground" value={String(f[key] ?? "")} placeholder={placeholder} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("profile")} subtitle={t("Your personal health details. These help the assistant give relevant answers.")} />
      <SectionCard>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("Full name", "name")}
          <label className="block text-xs text-muted-foreground">{t("Email")}<Input className="mt-1" value={s.user.email} disabled /></label>
          <label className="block text-xs text-muted-foreground">{t("Age")}<Input type="number" min={0} max={120} className="mt-1 text-foreground" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value === "" ? "" : Number(e.target.value) })} /></label>
          {field("Gender", "gender")}
          {field("Blood group", "bloodGroup", "O+")}
          {field("Phone", "phone")}
          {field("Emergency contact", "emergencyContact")}
          <div />
          {field("Conditions (comma separated)", "conditionsText", "Diabetes, Hypertension")}
          {field("Allergies (comma separated)", "allergiesText", "Penicillin")}
        </div>
        <Button className="mt-6" onClick={save}><Save className="size-4" /> {t("Save profile")}</Button>
      </SectionCard>
    </div>
  );
}

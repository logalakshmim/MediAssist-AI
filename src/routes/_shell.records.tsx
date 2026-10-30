import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, SectionCard, UploadZone } from "@/components/common";
import { todayISO, useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { seo } from "@/lib/seo";
import type { HealthRecord } from "@/lib/types";

export const Route = createFileRoute("/_shell/records")({
  head: () => seo("Health Records", "Upload and organise your lab reports, scans and medical documents."),
  component: Page,
});

const TYPES: HealthRecord["type"][] = ["Lab Report", "Prescription", "Discharge Summary", "Scan Report", "Medical Document"];

function Page() {
  const t = useT();
  const s = useStore();
  const [file, setFile] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<HealthRecord["type"]>("Lab Report");
  const [date, setDate] = useState(todayISO());
  const [provider, setProvider] = useState("");

  const save = () => {
    if (!file) { toast.error(t("Please choose a file first.")); return; }
    s.addRecord({ name: name.trim() || t(type), type, format: file.startsWith("data:application/pdf") ? "PDF" : "Image", date, provider, file });
    toast.success(t("Record saved."));
    setFile(null); setName(""); setProvider("");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("records")} subtitle={t("Upload and keep your lab reports, scans and medical documents in one place.")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard title={t("Upload a record")} className="lg:col-span-2">
          <UploadZone label={t("Upload report image or PDF")} hint={t("JPG, PNG or PDF up to 10 MB.")} accept="image/*,application/pdf" preview={file} onFile={(d, n) => { setFile(d); if (!name) setName(n.replace(/\.[^.]+$/, "")); }} />
          <div className="mt-4 grid gap-3">
            <label className="text-xs text-muted-foreground">{t("Name")}<Input className="mt-1 text-foreground" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="text-xs text-muted-foreground">{t("Type")}
              <Select value={type} onValueChange={(v) => setType(v as HealthRecord["type"])}>
                <SelectTrigger className="mt-1 text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((x) => <SelectItem key={x} value={x}>{t(x)}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="text-xs text-muted-foreground">{t("Date")}<Input type="date" className="mt-1 text-foreground" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="text-xs text-muted-foreground">{t("Hospital / lab")}<Input className="mt-1 text-foreground" value={provider} onChange={(e) => setProvider(e.target.value)} /></label>
            <Button onClick={save}><Upload className="size-4" /> {t("Save record")}</Button>
          </div>
        </SectionCard>
        <SectionCard title={t("My records")} className="lg:col-span-3">
          {s.records.length === 0 ? (
            <EmptyState title={t("No records yet")} description={t("Uploaded reports will appear here.")} />
          ) : (
            <ul className="divide-y divide-border">
              {s.records.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  {r.format === "PDF" ? <FileText className="size-8 text-accent" /> : r.file ? <img src={r.file} alt="" className="size-10 rounded-md object-cover" /> : <ImageIcon className="size-8 text-accent" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{t(r.type)} · {r.date}{r.provider ? ` · ${r.provider}` : ""}</span>
                  </span>
                  {r.file ? <Button asChild variant="outline" size="sm"><a href={r.file} download={`${r.name}.${r.format === "PDF" ? "pdf" : "jpg"}`}><Download className="size-4" /> {t("Download")}</a></Button> : null}
                  <Button asChild variant="outline" size="sm"><Link to="/simplifier">{t("Explain")}</Link></Button>
                  <Button variant="ghost" size="icon" aria-label={t("Delete")} onClick={() => { if (confirm(t("Delete this record?"))) { s.removeRecord(r.id); toast.success(t("Record deleted.")); } }}><Trash2 className="size-4 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

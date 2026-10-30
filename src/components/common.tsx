import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Camera, CheckCircle2, Inbox, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/useT";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("card-surface p-5 sm:p-6", className)}>
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Disclaimer({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex gap-2 rounded-xl border p-3 text-xs leading-relaxed",
        tone === "warning"
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-info/25 bg-info/5 text-muted-foreground",
      )}
    >
      {tone === "warning" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      ) : (
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
      )}
      <span>{children}</span>
    </p>
  );
}

export function MedicalDisclaimer() {
  const t = useT();
  return (
    <div className="card-surface mt-8 p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="size-4 text-accent" /> {t("Medical Disclaimer")}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("MediAssist AI helps you organise medicines and understand health information. It does not replace doctors, pharmacists, or emergency medical services. AI results can contain mistakes — always confirm with your doctor or pharmacist before acting on them. In an emergency, call 108.")}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t = useT();
  const tone =
    status === "taken"
      ? "bg-success/12 text-success border-success/30"
      : status === "pending"
        ? "bg-warning/15 text-warning-foreground border-warning/40"
        : status === "missed"
          ? "bg-destructive/10 text-destructive border-destructive/30"
          : "bg-muted text-muted-foreground border-border";
  const label = t(status.charAt(0).toUpperCase() + status.slice(1));
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tone)}>
      {status === "taken" ? <CheckCircle2 className="size-3.5" /> : null}
      {label}
    </span>
  );
}

/** Animated progress steps shown while a real AI request is running. */
export function useAIProgress(steps: string[], stepMs = 1400) {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const run = async <T,>(task: () => Promise<T>): Promise<T> => {
    setRunning(true);
    setIndex(0);
    timer.current = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), stepMs);
    try {
      return await task();
    } finally {
      if (timer.current) clearInterval(timer.current);
      setIndex(steps.length);
      setRunning(false);
    }
  };
  const reset = () => setIndex(-1);
  return { running, index, run, reset };
}

/** Resize an image data URL so uploads stay fast. PDFs pass through. */
export function compressImage(dataUrl: string, max = 1600): Promise<string> {
  if (!dataUrl.startsWith("data:image/") || dataUrl.startsWith("data:image/svg")) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function PipelineView({
  steps,
  index,
  running,
}: {
  steps: string[];
  index: number;
  running: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const state = i < index || (!running && index >= 0) ? "done" : i === index ? "active" : "idle";
        return (
          <div
            key={step}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all",
              state === "idle" && "border-border/60 text-muted-foreground/60",
              state === "active" && "border-accent/50 bg-accent/8 font-medium text-foreground shadow-soft",
              state === "done" && "border-success/30 bg-success/8 text-foreground",
            )}
          >
            {state === "active" ? (
              <Loader2 className="size-4 animate-spin text-accent" />
            ) : state === "done" ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <span className="size-4 rounded-full border border-current opacity-40" />
            )}
            {step}
          </div>
        );
      })}
    </div>
  );
}

export function UploadZone({
  label,
  hint,
  preview,
  onFile,
  accept = "image/*",
}: {
  label: string;
  hint?: string;
  preview: string | null;
  onFile: (dataUrl: string, name: string) => void;
  accept?: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const read = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(t("File is larger than 10 MB. Please choose a smaller file."));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => onFile(await compressImage(String(reader.result)), file.name);
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) read(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-accent bg-accent/8" : "border-border bg-muted/40",
      )}
    >
      {preview ? (
        preview.startsWith("data:application/pdf") ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm font-semibold">{t("PDF document selected")}</p>
        ) : (
          <img src={preview} alt={t("Uploaded document preview")} className="max-h-72 rounded-xl border border-border object-contain shadow-soft" />
        )
      ) : (
        <>
          <div className="flex size-14 items-center justify-center rounded-2xl gradient-brand text-primary-foreground">
            <Upload className="size-6" />
          </div>
          <p className="mt-4 font-semibold">{label}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> {preview ? t("Replace File") : t("Upload File")}
        </Button>
        <Button type="button" variant="outline" onClick={() => camRef.current?.click()}>
          <Camera className="size-4" /> {t("Use Camera")}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
    </div>
  );
}

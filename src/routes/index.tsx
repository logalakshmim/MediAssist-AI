import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Activity, Bell, Eye, EyeOff, Languages, Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Sign in", "Sign in to MediAssist AI — scan prescriptions, verify medicines and never miss a dose."),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Enter your full name").max(80),
});

function LoginPage() {
  const { ready, loggedIn, login, register } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && loggedIn) navigate({ to: "/dashboard" });
  }, [ready, loggedIn, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isReg = tab === "register";
    const parsed = (isReg ? registerSchema : loginSchema).safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    if (isReg && form.password !== form.confirm) return setError("Passwords do not match.");
    setBusy(true);
    const err = isReg ? await register(form.name, form.email, form.password) : await login(form.email, form.password);
    setBusy(false);
    if (err) return setError(err);
    toast.success(isReg ? "Account created. Welcome to MediAssist AI!" : "Signed in successfully.");
    navigate({ to: "/dashboard" });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden gradient-brand p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Activity className="size-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">MediAssist AI</p>
            <p className="text-xs opacity-80">Clinical Medication Assistant</p>
          </div>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Making Medication Safer, Smarter &amp; Simpler with AI.
          </h1>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              [ScanLine, "Scan handwritten or printed prescriptions and get a clear medicine schedule."],
              [ShieldCheck, "Photograph a medicine strip to check it matches what your doctor prescribed."],
              [Bell, "Dose reminders, adherence tracking and interaction alerts."],
              [Languages, "Explanations in English, தமிழ், हिन्दी and తెలుగు."],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ScanLine;
              return (
                <li key={i} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <I className="size-4" />
                  </span>
                  <span className="pt-1.5 opacity-90">{text as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs opacity-70">MediAssist AI supports — and never replaces — your doctor and pharmacist.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl gradient-brand text-primary-foreground">
              <Activity className="size-5" />
            </div>
            <p className="font-display text-lg font-bold">MediAssist AI</p>
          </div>
          <h2 className="font-display text-2xl font-bold">{tab === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login" ? "Sign in to manage your medicines." : "It takes less than a minute."}
          </p>

          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null); }} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <TabsContent value="register" className="m-0 space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={set("name")} autoComplete="name" placeholder="Your full name" />
              </TabsContent>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder="At least 6 characters" className="pr-10" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <TabsContent value="register" className="m-0 space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
              </TabsContent>
              {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {tab === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Your account and health data are stored privately on this device.
          </p>
        </div>
      </section>
    </div>
  );
}

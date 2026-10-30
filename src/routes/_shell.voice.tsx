import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalDisclaimer, PageHeader, SectionCard } from "@/components/common";
import { askAssistant } from "@/lib/ai.functions";
import { patientContext } from "@/lib/context";
import { languages } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { createRecognizer, speak } from "@/lib/speech";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export const Route = createFileRoute("/_shell/voice")({
  head: () => seo("Voice Assistant", "Talk to MediAssist in English, Tamil, Hindi or Telugu."),
  component: Page,
});

type Phase = "idle" | "listening" | "processing" | "speaking";

function Page() {
  const t = useT();
  const s = useStore();
  const ask = useServerFn(askAssistant);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [log, setLog] = useState<ChatMessage[]>([]);
  const [typed, setTyped] = useState("");
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  const answer = async (q: string) => {
    if (!q.trim()) { setPhase("idle"); return; }
    const next: ChatMessage[] = [...log, { role: "user", content: q }];
    setLog(next);
    setPhase("processing");
    const res = await ask({ data: { messages: next.slice(-10), language: s.language, short: true, context: patientContext(s.user, s.medications, s.doses, s.prescriptions) } });
    const reply = res.ok ? res.data.reply : res.error;
    setLog([...next, { role: "assistant", content: reply }]);
    setPhase("speaking");
    if (!speak(reply, s.language, () => setPhase("idle"))) setPhase("idle");
  };

  const listen = () => {
    if (phase === "listening") { recRef.current?.stop(); return; }
    const rec = createRecognizer(s.language);
    if (!rec) { toast.error(t("Voice input is not supported in this browser. Please type your question below.")); return; }
    recRef.current = rec;
    let finalText = "";
    setHeard("");
    rec.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i]?.[0]?.transcript ?? "";
      finalText = txt;
      setHeard(txt);
    };
    rec.onerror = (e) => { if (e.error !== "no-speech") toast.error(t("Could not hear you. Please check microphone permission.")); };
    rec.onend = () => { void answer(finalText); };
    setPhase("listening");
    rec.start();
  };

  const status = { idle: t("Tap the microphone and speak"), listening: t("Listening..."), processing: t("Processing..."), speaking: t("Speaking...") }[phase];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("voice")} subtitle={t("Speak your question. The assistant answers aloud in your selected language.")}>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{languages.find((l) => l.code === s.language)?.native}</span>
      </PageHeader>
      <SectionCard>
        <div className="flex flex-col items-center py-6 text-center">
          <button
            onClick={listen}
            disabled={phase === "processing"}
            aria-label={phase === "listening" ? t("Stop listening") : t("Start speaking")}
            className={cn("flex size-28 items-center justify-center rounded-full gradient-brand text-primary-foreground shadow-soft transition-transform", phase === "listening" && "animate-pulse scale-105")}
          >
            {phase === "listening" ? <MicOff className="size-10" /> : <Mic className="size-10" />}
          </button>
          <p className="mt-4 font-semibold" aria-live="polite">{status}</p>
          {heard ? <p className="mt-1 text-sm text-muted-foreground">“{heard}”</p> : null}
        </div>
        <form className="flex gap-2 border-t border-border pt-4" onSubmit={(e) => { e.preventDefault(); const q = typed; setTyped(""); void answer(q); }}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("Or type your question...")} aria-label={t("Or type your question...")} />
          <Button type="submit" disabled={phase === "processing" || !typed.trim()}><Send className="size-4" /></Button>
        </form>
      </SectionCard>
      {log.length ? (
        <SectionCard title={t("Conversation")} className="mt-6">
          <ul className="space-y-3 text-sm">
            {log.map((m, i) => (
              <li key={i} className={cn("rounded-xl p-3", m.role === "user" ? "bg-primary/8" : "bg-muted")}>
                <span className="block text-xs font-semibold text-muted-foreground">{m.role === "user" ? t("You") : t("Assistant")}</span>
                {m.content}
                {m.role === "assistant" ? <button className="ml-2 inline-flex items-center gap-1 text-xs text-accent" onClick={() => speak(m.content, s.language)}><Volume2 className="size-3.5" /> {t("Replay")}</button> : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <MedicalDisclaimer />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Trash2, User, Volume2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MedicalDisclaimer, PageHeader, SectionCard } from "@/components/common";
import { askAssistant } from "@/lib/ai.functions";
import { patientContext } from "@/lib/context";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { speak } from "@/lib/speech";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => seo("AI Medication Assistant", "Ask questions about your medicines, schedule and health reports."),
  component: Page,
});

const SUGGESTIONS = ["What is my next medicine?", "Can I take my medicines with milk?", "What should I do if I miss a dose?", "What are the side effects of my medicines?"];

function Page() {
  const t = useT();
  const s = useStore();
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s.chat.length, busy]);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const next: ChatMessage[] = [...s.chat, { role: "user", content: text }];
    s.setChat(next);
    setInput("");
    setBusy(true);
    const res = await ask({ data: { messages: next.slice(-20), language: s.language, context: patientContext(s.user, s.medications, s.doses, s.prescriptions) } });
    setBusy(false);
    s.setChat([...next, { role: "assistant", content: res.ok ? res.data.reply : `⚠ ${res.error}` }]);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("assistant")} subtitle={t("Ask about your medicines, timings, side effects or reports. Answers use your saved medicines.")}>
        {s.chat.length ? <Button variant="outline" size="sm" onClick={() => s.setChat([])}><Trash2 className="size-4" /> {t("Clear chat")}</Button> : null}
      </PageHeader>
      <SectionCard>
        <div className="flex h-[55vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {s.chat.length === 0 ? (
              <div className="py-6 text-center">
                <Bot className="mx-auto size-10 text-accent" />
                <p className="mt-2 font-semibold">{t("How can I help you today?")}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((q) => <Button key={q} variant="outline" size="sm" onClick={() => send(t(q))}>{t(q)}</Button>)}
                </div>
              </div>
            ) : null}
            {s.chat.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent/15 text-accent")}>
                  {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </span>
                <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {m.content}
                  {m.role === "assistant" ? (
                    <button className="mt-1 flex items-center gap-1 text-xs text-accent" onClick={() => speak(m.content, s.language)}><Volume2 className="size-3.5" /> {t("Read aloud")}</button>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? <p className="text-sm text-muted-foreground">{t("Thinking...")}</p> : null}
            <div ref={endRef} />
          </div>
          <form className="mt-3 flex gap-2 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("Type your question...")} aria-label={t("Type your question...")} />
            <Button type="submit" disabled={busy || !input.trim()}><Send className="size-4" /> {t("Send")}</Button>
          </form>
        </div>
      </SectionCard>
      <MedicalDisclaimer />
    </div>
  );
}

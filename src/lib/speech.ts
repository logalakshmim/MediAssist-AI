import type { Language } from "./types";
import { speechLocale } from "./i18n";

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak text aloud in the chosen language using the browser voice engine. */
export function speak(text: string, lang: Language, onEnd?: () => void) {
  if (!canSpeak() || !text.trim()) {
    onEnd?.();
    return false;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
  const locale = speechLocale[lang];
  u.lang = locale;
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang === locale) ?? voices.find((v) => v.lang.startsWith(lang));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function createRecognizer(lang: Language): Rec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = speechLocale[lang];
  r.interimResults = true;
  r.continuous = false;
  return r;
}

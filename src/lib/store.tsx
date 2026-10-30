import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type {
  ChatMessage,
  Dose,
  DoseStatus,
  HealthRecord,
  HistoryEvent,
  Language,
  Medication,
  Notification,
  Prescription,
  UserProfile,
  VerificationLog,
} from "./types";

const ACCOUNTS_KEY = "mediassist.accounts";
const SESSION_KEY = "mediassist.session";
const dataKey = (email: string) => `mediassist.data.${email}`;

interface Settings {
  doseReminders: boolean;
  interactionAlerts: boolean;
  refillAlerts: boolean;
  browserNotifications: boolean;
  voiceReplies: boolean;
  largeText: boolean;
}

interface UserData {
  user: UserProfile;
  medications: Medication[];
  doseLog: Record<string, DoseStatus>;
  prescriptions: Prescription[];
  records: HealthRecord[];
  history: HistoryEvent[];
  notifications: Notification[];
  chat: ChatMessage[];
  verifications: VerificationLog[];
  settings: Settings;
}

interface Account {
  name: string;
  salt: string;
  hash: string;
}

const emptyData = (name: string, email: string): UserData => ({
  user: {
    name,
    age: "",
    gender: "",
    bloodGroup: "",
    email,
    phone: "",
    emergencyContact: "",
    language: "en",
    conditions: [],
    allergies: [],
  },
  medications: [],
  doseLog: {},
  prescriptions: [],
  records: [],
  history: [],
  notifications: [
    { id: uid(), kind: "info" as const, message: `Welcome to MediAssist AI, ${name}. Start by scanning a prescription.`, time: nowLabel(), read: false },
  ],
  chat: [],
  verifications: [],
  settings: {
    doseReminders: true,
    interactionAlerts: true,
    refillAlerts: true,
    browserNotifications: false,
    voiceReplies: true,
    largeText: false,
  },
});

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function nowLabel() {
  return new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
export function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

async function hashPassword(password: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readAccounts(): Record<string, Account> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Doses scheduled for a medication on a given date. */
export function medActiveOn(m: Medication, date: string) {
  if (!m.active) return false;
  if (date < m.startDate) return false;
  if (m.durationDays > 0 && date > addDays(m.startDate, m.durationDays - 1)) return false;
  return true;
}

export function buildDoses(meds: Medication[], log: Record<string, DoseStatus>, date: string): Dose[] {
  const now = new Date();
  const today = todayISO(now);
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const out: Dose[] = [];
  for (const m of meds) {
    if (!medActiveOn(m, date)) continue;
    for (const time of m.times) {
      const key = `${m.id}|${date}|${time}`;
      let status: DoseStatus = log[key] ?? "pending";
      if (!log[key] && (date < today || (date === today && time < addMinutes(hm, -120)))) status = "missed";
      out.push({ key, medId: m.id, date, time, medication: `${m.name} ${m.strength}`.trim(), dosage: m.dosage, status });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

function addMinutes(hm: string, n: number) {
  const [h = 0, m = 0] = hm.split(":").map(Number);
  const t = Math.max(0, h * 60 + m + n);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

interface StoreValue extends UserData {
  ready: boolean;
  loggedIn: boolean;
  language: Language;
  doses: Dose[];
  adherence: number;
  weekly: { day: string; taken: number; missed: number; rate: number }[];
  register: (name: string, email: string, password: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDoseStatus: (key: string, status: DoseStatus) => void;
  addMedication: (med: Omit<Medication, "id">) => void;
  updateMedication: (id: string, patch: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  addPrescription: (rx: Omit<Prescription, "id" | "createdAt">, addMeds: boolean) => string;
  removePrescription: (id: string) => void;
  addRecord: (rec: Omit<HealthRecord, "id" | "uploadedOn">) => void;
  removeRecord: (id: string) => void;
  addHistory: (e: Omit<HistoryEvent, "id">) => void;
  removeHistory: (id: string) => void;
  addVerification: (v: Omit<VerificationLog, "id" | "at">) => void;
  setChat: (c: ChatMessage[]) => void;
  pushNotification: (n: Omit<Notification, "id" | "read" | "time">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  clearAllData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [data, setData] = useState<UserData>(emptyData("", ""));
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const notified = useRef<Set<string>>(new Set());

  const load = useCallback((em: string) => {
    const acc = readAccounts()[em];
    let d = emptyData(acc?.name ?? "", em);
    try {
      const raw = localStorage.getItem(dataKey(em));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserData>;
        d = { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings ?? {}) } };
      }
    } catch {
      /* ignore */
    }
    setData(d);
    setEmail(em);
  }, []);

  useEffect(() => {
    const s = localStorage.getItem(SESSION_KEY);
    if (s && readAccounts()[s]) load(s);
    setReady(true);
  }, [load]);

  useEffect(() => {
    if (!email) return;
    try {
      localStorage.setItem(dataKey(email), JSON.stringify(data));
    } catch {
      toast.error("Browser storage is full. Remove some uploaded records to free space.");
    }
  }, [data, email]);

  useEffect(() => {
    document.documentElement.classList.toggle("text-lg-mode", data.settings.largeText);
    document.documentElement.lang = data.user.language;
  }, [data.settings.largeText, data.user.language]);

  // Minute ticker for reminders
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const patch = useCallback((fn: (s: UserData) => UserData) => setData((s) => fn(s)), []);

  const today = todayISO();
  const doses = useMemo(() => buildDoses(data.medications, data.doseLog, today), [data.medications, data.doseLog, today, tick]);

  // Reminder engine
  useEffect(() => {
    if (!email || !data.settings.doseReminders) return;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    for (const d of doses) {
      const med = data.medications.find((m) => m.id === d.medId);
      if (!med?.reminderOn || d.status !== "pending") continue;
      if (d.time <= hm && d.time >= addMinutes(hm, -15) && !notified.current.has(d.key)) {
        notified.current.add(d.key);
        const msg = `Time to take ${d.medication} (${d.dosage}) — scheduled ${d.time}.`;
        toast.info(msg, { duration: 12000 });
        if (data.settings.browserNotifications && "Notification" in window && Notification.permission === "granted") {
          new Notification("MediAssist AI reminder", { body: msg });
        }
        patch((s) => ({
          ...s,
          notifications: [{ id: uid(), kind: "reminder" as const, message: msg, time: nowLabel(), read: false }, ...s.notifications].slice(0, 50),
        }));
      }
    }
  }, [doses, email, data.settings, data.medications, patch]);

  const value = useMemo<StoreValue>(() => {
    // Last 7 days adherence
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const ds = buildDoses(data.medications, data.doseLog, date).filter((d) => date < today || d.status !== "pending");
      const taken = ds.filter((d) => d.status === "taken").length;
      const missed = ds.filter((d) => d.status === "missed" || d.status === "skipped").length;
      const day = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
      return { day, taken, missed, rate: taken + missed ? Math.round((taken / (taken + missed)) * 100) : 0 };
    });
    const tt = weekly.reduce((a, w) => a + w.taken, 0);
    const tm = weekly.reduce((a, w) => a + w.missed, 0);
    const adherence = tt + tm ? Math.round((tt / (tt + tm)) * 100) : 0;

    const notify = (s: UserData, kind: Notification["kind"], message: string): Notification[] =>
      [{ id: uid(), kind, message, time: nowLabel(), read: false }, ...s.notifications].slice(0, 50);

    return {
      ...data,
      ready,
      loggedIn: !!email,
      language: data.user.language,
      doses,
      adherence,
      weekly,
      register: async (name, em, password) => {
        const e = em.trim().toLowerCase();
        const accounts = readAccounts();
        if (accounts[e]) return "An account with this email already exists. Please sign in.";
        const salt = uid() + uid();
        accounts[e] = { name: name.trim(), salt, hash: await hashPassword(password, salt) };
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        localStorage.setItem(SESSION_KEY, e);
        load(e);
        return null;
      },
      login: async (em, password) => {
        const e = em.trim().toLowerCase();
        const acc = readAccounts()[e];
        if (!acc) return "No account found with this email. Please create an account.";
        if ((await hashPassword(password, acc.salt)) !== acc.hash) return "Incorrect password. Please try again.";
        localStorage.setItem(SESSION_KEY, e);
        load(e);
        return null;
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        setEmail(null);
        setData(emptyData("", ""));
      },
      setLanguage: (lang) => patch((s) => ({ ...s, user: { ...s.user, language: lang } })),
      updateUser: (p) => patch((s) => ({ ...s, user: { ...s.user, ...p } })),
      updateSettings: (p) => patch((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      setDoseStatus: (key, status) => patch((s) => ({ ...s, doseLog: { ...s.doseLog, [key]: status } })),
      addMedication: (med) =>
        patch((s) => ({
          ...s,
          medications: [{ ...med, id: uid() }, ...s.medications],
          notifications: notify(s, "success", `${med.name} ${med.strength} added to your medications.`),
        })),
      updateMedication: (id, p) =>
        patch((s) => ({ ...s, medications: s.medications.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
      removeMedication: (id) => patch((s) => ({ ...s, medications: s.medications.filter((m) => m.id !== id) })),
      addPrescription: (rx, addMeds) => {
        const id = `RX-${uid().slice(0, 6).toUpperCase()}`;
        patch((s) => {
          const meds: Medication[] = addMeds
            ? rx.medicines.map((m) => ({
                id: uid(),
                name: m.name,
                strength: m.strength,
                form: m.form,
                dosage: m.dosage || "1",
                frequency: m.frequency,
                times: m.times.length ? m.times : ["09:00"],
                instructions: [m.timing, m.notes].filter(Boolean).join(" · "),
                durationDays: m.durationDays || 0,
                startDate: todayISO(),
                purpose: m.purpose,
                reminderOn: true,
                active: true,
                prescriptionId: id,
              }))
            : [];
          return {
            ...s,
            prescriptions: [{ ...rx, id, createdAt: new Date().toISOString() }, ...s.prescriptions],
            medications: [...meds, ...s.medications],
            history: [
              {
                id: uid(),
                date: todayISO(),
                category: "Prescription",
                title: `Prescription from ${rx.doctor || "doctor"}`,
                detail: rx.medicines.map((m) => `${m.name} ${m.strength}`).join(", "),
              },
              ...s.history,
            ],
            notifications: notify(s, "success", `Prescription ${id} saved with ${rx.medicines.length} medicine(s).`),
          };
        });
        return id;
      },
      removePrescription: (id) => patch((s) => ({ ...s, prescriptions: s.prescriptions.filter((r) => r.id !== id) })),
      addRecord: (rec) =>
        patch((s) => ({
          ...s,
          records: [{ ...rec, id: uid(), uploadedOn: todayISO() }, ...s.records],
          notifications: notify(s, "info", `${rec.name} uploaded to Health Records.`),
        })),
      removeRecord: (id) => patch((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) })),
      addHistory: (e) => patch((s) => ({ ...s, history: [{ ...e, id: uid() }, ...s.history] })),
      removeHistory: (id) => patch((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) })),
      addVerification: (v) =>
        patch((s) => ({
          ...s,
          verifications: [{ ...v, id: uid(), at: new Date().toISOString() }, ...s.verifications].slice(0, 100),
        })),
      setChat: (c) => patch((s) => ({ ...s, chat: c.slice(-40) })),
      pushNotification: (n) => patch((s) => ({ ...s, notifications: notify(s, n.kind, n.message) })),
      markNotificationRead: (id) =>
        patch((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => patch((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearAllData: () => patch((s) => ({ ...emptyData(s.user.name, s.user.email), user: s.user })),
    };
  }, [data, ready, email, doses, today, patch, load]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

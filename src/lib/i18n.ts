import type { Language } from "./types";
import phrases from "./phrases.json";

export const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

type Dict = Record<string, string>;

const en: Dict = {
  dashboard: "Dashboard",
  prescriptions: "Prescriptions",
  scan: "Scan Prescription",
  medications: "Medications",
  verify: "Medicine Verification",
  interactions: "Drug Interaction",
  reminders: "Reminders",
  records: "Health Records",
  history: "Medical History",
  assistant: "AI Medication Assistant",
  voice: "Voice Assistant",
  reports: "Reports",
  settings: "Settings",
  simplifier: "Prescription Simplifier",
  profile: "Profile",
  search: "Search medicines, prescriptions, reports...",
  logout: "Logout",
  greeting: "Good Morning",
  overview: "Here's your medication and health overview.",
  activeMeds: "Active Medications",
  todayMeds: "Today's Medicines",
  pendingReminders: "Pending Reminders",
  healthReports: "Health Reports",
  interactionAlerts: "Interaction Alerts",
  takeNow: "Take Now",
  taken: "Taken",
  pending: "Pending",
  language: "Preferred Language",
};

const ta: Dict = {
  dashboard: "முகப்பு",
  prescriptions: "மருந்துச் சீட்டுகள்",
  scan: "சீட்டை ஸ்கேன் செய்",
  medications: "மருந்துகள்",
  verify: "மருந்து சரிபார்ப்பு",
  interactions: "மருந்து இடைவினை",
  reminders: "நினைவூட்டல்கள்",
  records: "சுகாதார ஆவணங்கள்",
  history: "மருத்துவ வரலாறு",
  assistant: "AI உதவியாளர்",
  voice: "குரல் உதவியாளர்",
  reports: "அறிக்கைகள்",
  settings: "அமைப்புகள்",
  simplifier: "சீட்டு விளக்கம்",
  profile: "சுயவிவரம்",
  search: "மருந்துகள், சீட்டுகள், அறிக்கைகளைத் தேடுங்கள்...",
  logout: "வெளியேறு",
  greeting: "காலை வணக்கம்",
  overview: "உங்கள் மருந்து மற்றும் சுகாதார சுருக்கம்.",
  activeMeds: "செயலில் உள்ள மருந்துகள்",
  todayMeds: "இன்றைய மருந்துகள்",
  pendingReminders: "நிலுவை நினைவூட்டல்கள்",
  healthReports: "சுகாதார அறிக்கைகள்",
  interactionAlerts: "இடைவினை எச்சரிக்கைகள்",
  takeNow: "இப்போது எடுக்கவும்",
  taken: "எடுக்கப்பட்டது",
  pending: "நிலுவையில்",
  language: "விருப்ப மொழி",
};

const hi: Dict = {
  dashboard: "डैशबोर्ड",
  prescriptions: "पर्चे",
  scan: "पर्चा स्कैन करें",
  medications: "दवाइयाँ",
  verify: "दवा सत्यापन",
  interactions: "दवा इंटरैक्शन",
  reminders: "रिमाइंडर",
  records: "स्वास्थ्य रिकॉर्ड",
  history: "चिकित्सा इतिहास",
  assistant: "AI सहायक",
  voice: "वॉइस सहायक",
  reports: "रिपोर्ट",
  settings: "सेटिंग्स",
  simplifier: "पर्चा सरलीकरण",
  profile: "प्रोफ़ाइल",
  search: "दवाइयाँ, पर्चे, रिपोर्ट खोजें...",
  logout: "लॉगआउट",
  greeting: "सुप्रभात",
  overview: "यह आपकी दवा और स्वास्थ्य जानकारी है।",
  activeMeds: "सक्रिय दवाइयाँ",
  todayMeds: "आज की दवाइयाँ",
  pendingReminders: "लंबित रिमाइंडर",
  healthReports: "स्वास्थ्य रिपोर्ट",
  interactionAlerts: "इंटरैक्शन अलर्ट",
  takeNow: "अभी लें",
  taken: "ली गई",
  pending: "लंबित",
  language: "पसंदीदा भाषा",
};

const te: Dict = {
  dashboard: "డాష్‌బోర్డ్",
  prescriptions: "ప్రిస్క్రిప్షన్లు",
  scan: "ప్రిస్క్రిప్షన్ స్కాన్",
  medications: "మందులు",
  verify: "మందు ధృవీకరణ",
  interactions: "మందుల పరస్పర చర్య",
  reminders: "రిమైండర్లు",
  records: "ఆరోగ్య రికార్డులు",
  history: "వైద్య చరిత్ర",
  assistant: "AI సహాయకుడు",
  voice: "వాయిస్ సహాయకుడు",
  reports: "నివేదికలు",
  settings: "సెట్టింగ్‌లు",
  simplifier: "ప్రిస్క్రిప్షన్ వివరణ",
  profile: "ప్రొఫైల్",
  search: "మందులు, ప్రిస్క్రిప్షన్లు, నివేదికలు వెతకండి...",
  logout: "లాగ్ అవుట్",
  greeting: "శుభోదయం",
  overview: "మీ మందులు మరియు ఆరోగ్య సమాచారం.",
  activeMeds: "సక్రియ మందులు",
  todayMeds: "నేటి మందులు",
  pendingReminders: "పెండింగ్ రిమైండర్లు",
  healthReports: "ఆరోగ్య నివేదికలు",
  interactionAlerts: "పరస్పర చర్య హెచ్చరికలు",
  takeNow: "ఇప్పుడు తీసుకోండి",
  taken: "తీసుకున్నారు",
  pending: "పెండింగ్",
  language: "ప్రాధాన్య భాష",
};

const dicts: Record<Language, Dict> = { en, ta, hi, te };

const phraseDicts = phrases as Record<"ta" | "hi" | "te", Record<string, string>>;

/** Look up a short key (e.g. "dashboard") or a full English phrase, with optional {var} values. */
export function translator(lang: Language) {
  return (key: string, vars?: Record<string, string | number>) => {
    let out = dicts[lang][key] ?? en[key] ?? (lang === "en" ? undefined : phraseDicts[lang][key]) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
}

export const voiceScript: Record<Language, { user: string; reply: string; listening: string; processing: string }> = {
  en: {
    user: "What is my next medicine?",
    reply: "Your next medicine is Atorvastatin 10mg at 6 PM.",
    listening: "Listening...",
    processing: "Processing...",
  },
  ta: {
    user: "என்னுடைய அடுத்த மருந்து எப்போது?",
    reply: "உங்களுடைய அடுத்த மருந்து Atorvastatin 10mg. நேரம் மாலை 6 மணி.",
    listening: "கேட்கிறது...",
    processing: "செயலாக்கம்...",
  },
  hi: {
    user: "मेरी अगली दवा कब है?",
    reply: "आपकी अगली दवा Atorvastatin 10mg है। समय शाम 6 बजे है।",
    listening: "सुन रहा है...",
    processing: "प्रोसेस हो रहा है...",
  },
  te: {
    user: "నా తదుపరి మందు ఎప్పుడు?",
    reply: "మీ తదుపరి మందు Atorvastatin 10mg. సమయం సాయంత్రం 6 గంటలకు.",
    listening: "వింటోంది...",
    processing: "ప్రాసెస్ అవుతోంది...",
  },
};

export const speechLocale: Record<Language, string> = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
  te: "te-IN",
};

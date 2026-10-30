export type Language = "en" | "ta" | "hi" | "te";
export type DoseStatus = "taken" | "pending" | "missed" | "skipped";

export interface Medication {
  id: string;
  name: string;
  strength: string;
  form: string;
  dosage: string;
  frequency: string;
  times: string[]; // "HH:MM"
  instructions: string;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  purpose: string;
  reminderOn: boolean;
  active: boolean;
  prescriptionId?: string;
}

export interface Dose {
  key: string; // medId|date|time
  medId: string;
  date: string;
  time: string;
  medication: string;
  dosage: string;
  status: DoseStatus;
}

export interface RxMedicine {
  name: string;
  strength: string;
  form: string;
  dosage: string;
  frequency: string;
  times: string[];
  timing: string;
  durationDays: number;
  purpose: string;
  notes: string;
}

export interface Prescription {
  id: string;
  doctor: string;
  clinic: string;
  date: string;
  patient: string;
  diagnosis: string;
  medicines: RxMedicine[];
  advice: string;
  warnings: string[];
  rawText: string;
  image?: string;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  name: string;
  type: "Lab Report" | "Prescription" | "Discharge Summary" | "Scan Report" | "Medical Document";
  format: "PDF" | "Image";
  date: string;
  provider: string;
  uploadedOn: string;
  file?: string;
}

export interface HistoryEvent {
  id: string;
  date: string;
  category: "Condition" | "Consultation" | "Procedure" | "Previous Medication" | "Allergy" | "Prescription" | "Verification";
  title: string;
  detail: string;
}

export interface Notification {
  id: string;
  kind: "reminder" | "success" | "warning" | "info";
  message: string;
  time: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  age: number | "";
  gender: string;
  bloodGroup: string;
  email: string;
  phone: string;
  emergencyContact: string;
  language: Language;
  conditions: string[];
  allergies: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VerificationLog {
  id: string;
  at: string;
  name: string;
  verdict: string;
}

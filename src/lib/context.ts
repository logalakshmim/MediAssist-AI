import type { Dose, Medication, Prescription, UserProfile } from "./types";

export function patientContext(user: UserProfile, meds: Medication[], doses: Dose[], rx: Prescription[]) {
  const now = new Date();
  return [
    `Current time: ${now.toLocaleString("en-IN")}`,
    `Name: ${user.name}; Age: ${user.age || "unknown"}; Gender: ${user.gender || "unknown"}; Blood group: ${user.bloodGroup || "unknown"}`,
    `Conditions: ${user.conditions.join(", ") || "none recorded"}; Allergies: ${user.allergies.join(", ") || "none recorded"}`,
    `Active medications: ${meds.filter((m) => m.active).map((m) => `${m.name} ${m.strength} — ${m.dosage}, ${m.frequency} at ${m.times.join("/")} (${m.instructions || "no special instructions"}) for ${m.purpose || "unspecified"}`).join("; ") || "none"}`,
    `Today's doses: ${doses.map((d) => `${d.time} ${d.medication} [${d.status}]`).join("; ") || "none scheduled"}`,
    `Prescriptions: ${rx.slice(0, 5).map((r) => `${r.date || r.createdAt.slice(0, 10)} ${r.doctor}: ${r.medicines.map((m) => m.name).join(", ")}`).join("; ") || "none"}`,
  ].join("\n").slice(0, 5800);
}

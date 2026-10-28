// Shared domain types. These mirror the contract the NestJS API will expose.

export type Role = "doctor" | "patient";

export type Specialty = "Physician" | "Surgeon";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Doctor extends User {
  role: "doctor";
  specialty: Specialty;
}

export type PatientStatus = "Stable" | "Follow-up" | "Critical" | "Post-op";

export type Gender = "Female" | "Male" | "Other";

export type MedicationStatus = "active" | "discontinued";

export const MEDICATION_ROUTES = [
  "Oral",
  "Inhaled",
  "Topical",
  "Sublingual",
  "Subcutaneous",
  "Intramuscular",
  "Intravenous",
] as const;

export type MedicationRoute = (typeof MEDICATION_ROUTES)[number];

/** A prescription. Discontinued ones stay on the record as medication history. */
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  instructions: string | null;
  status: MedicationStatus;
  startedOn: string; // ISO date
  endedOn: string | null; // ISO date; set when discontinued
  prescribedBy: { id: string; name: string };
}

export interface NewPrescription {
  name: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  instructions?: string;
  startedOn?: string; // ISO date; defaults to today
}

export type LabFlag = "normal" | "low" | "high" | "critical";

export interface LabResult {
  id: string;
  collectedOn: string; // ISO date
  test: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
}

export type ImagingModality = "X-ray" | "CT" | "MRI" | "Ultrasound";

export interface ImagingReport {
  id: string;
  performedOn: string; // ISO date
  modality: ImagingModality;
  study: string;
  findings: string;
  impression: string;
  reportedBy: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Visit {
  date: string; // ISO date
  reason: string;
  notes: string;
}

export interface Patient {
  id: string;
  doctorId: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string; // ISO date
  bloodType: string;
  address: string | null;
  preferredLanguage: string | null;
  emergencyContact: EmergencyContact | null;
  status: PatientStatus;
  conditions: string[];
  allergies: string[];
  /** Active first, then history; newest first within each. */
  medications: Medication[];
  labResults: LabResult[]; // newest first
  imagingReports: ImagingReport[]; // newest first
  visits: Visit[];
  lastVisit: string; // ISO date
  nextAppointment: string | null; // ISO datetime
}

/** The subset of a patient shown in list views. */
export type PatientSummary = Pick<
  Patient,
  | "id"
  | "name"
  | "gender"
  | "dateOfBirth"
  | "status"
  | "conditions"
  | "lastVisit"
  | "nextAppointment"
>;

export interface PatientQuery {
  q?: string;
  status?: PatientStatus;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

/** What a signed-in patient sees about their care team. */
export interface CareTeam {
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: Specialty };
}

// ---- Messaging & calls -------------------------------------------------------

export type CallKind = "audio" | "video";

export type CallStatus = "ringing" | "active" | "ended";

export type CallEndReason = "completed" | "declined" | "missed" | "cancelled" | "failed";

export interface Call {
  id: string;
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  kind: CallKind;
  status: CallStatus;
  endReason?: CallEndReason;
  createdAt: string; // ISO datetime
  answeredAt?: string;
  endedAt?: string;
}

export interface Message {
  id: string;
  /** Each patient has exactly one doctor, so the patient id identifies the conversation. */
  patientId: string;
  doctorId: string;
  sender: Role;
  body: string;
  sentAt: string; // ISO datetime
  /** Set on call-log entries ("Missed video call"), which are rendered differently. */
  call?: Pick<Call, "id" | "kind" | "endReason" | "answeredAt" | "endedAt">;
}

/** WebRTC signaling payloads relayed between the two call participants. */
export type SignalData =
  | { type: "offer" | "answer"; sdp: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

export type RealtimeEvent =
  | { type: "message"; message: Message }
  | { type: "call"; call: Call }
  | { type: "medication"; medication: Medication }
  | { type: "signal"; callId: string; data: SignalData };

export const PATIENT_STATUSES: PatientStatus[] = [
  "Stable",
  "Follow-up",
  "Critical",
  "Post-op",
];

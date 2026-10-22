// Domain types shared by the API's modules. They define the JSON contract the web app
// consumes (mirrored in web/src/lib/types.ts).

export type Role = 'doctor' | 'patient';

export type Specialty = 'Physician' | 'Surgeon';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Doctor extends User {
  role: 'doctor';
  specialty: Specialty;
}

export type PatientStatus = 'Stable' | 'Follow-up' | 'Critical' | 'Post-op';

export const PATIENT_STATUSES: PatientStatus[] = [
  'Stable',
  'Follow-up',
  'Critical',
  'Post-op',
];

export type Gender = 'Female' | 'Male' | 'Other';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startedOn: string; // ISO date
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
  status: PatientStatus;
  conditions: string[];
  allergies: string[];
  medications: Medication[];
  visits: Visit[];
  lastVisit: string; // ISO date
  nextAppointment: string | null; // ISO datetime
}

/** The subset of a patient shown in list views. */
export type PatientSummary = Pick<
  Patient,
  | 'id'
  | 'name'
  | 'gender'
  | 'dateOfBirth'
  | 'status'
  | 'conditions'
  | 'lastVisit'
  | 'nextAppointment'
>;

export interface AuthResult {
  user: User;
  accessToken: string;
}

/** What a signed-in patient sees about their care team. */
export interface CareTeam {
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: Specialty };
}

/** The two people in a conversation. Each patient has exactly one doctor. */
export interface Conversation {
  doctor: { id: string; name: string };
  patient: { id: string; name: string };
}

// ---- Messaging & calls -------------------------------------------------------

export type CallKind = 'audio' | 'video';

export type CallStatus = 'ringing' | 'active' | 'ended';

export type CallEndReason =
  'completed' | 'declined' | 'missed' | 'cancelled' | 'failed';

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
  call?: Pick<Call, 'id' | 'kind' | 'endReason' | 'answeredAt' | 'endedAt'>;
}

export interface IceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

/** WebRTC signaling payloads relayed between the two call participants. */
export type SignalData =
  | { type: 'offer' | 'answer'; sdp: string }
  | { type: 'candidate'; candidate: IceCandidate };

export type RealtimeEvent =
  | { type: 'message'; message: Message }
  | { type: 'call'; call: Call }
  | { type: 'signal'; callId: string; data: SignalData };

/** A user as identified by their access token. */
export interface Participant {
  role: Role;
  id: string;
}

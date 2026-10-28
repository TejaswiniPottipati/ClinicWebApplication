import "server-only";
import type {
  AuthResult,
  Call,
  CallKind,
  CareTeam,
  Medication,
  Message,
  NewPrescription,
  Patient,
  PatientQuery,
  PatientSummary,
  SignalData,
} from "@/lib/types";
import { httpApi } from "./http";

export { ApiError } from "./http";

/** Identifies the caller on every request to the clinic API. */
export interface ApiContext {
  accessToken: string;
}

export type CallAction = "accept" | "decline" | "end";

/** The NestJS clinic API (see api/). Every method throws ApiError on failure unless noted. */
export interface ClinicApi {
  /** Resolves to null for wrong credentials. */
  login(email: string, password: string): Promise<AuthResult | null>;
  listPatients(ctx: ApiContext, query?: PatientQuery): Promise<PatientSummary[]>;
  /** Resolves to null if the patient doesn't exist or isn't the doctor's. */
  getPatient(ctx: ApiContext, id: string): Promise<Patient | null>;
  /** For a signed-in patient: themselves and their assigned doctor. Null if not found. */
  getCareTeam(ctx: ApiContext): Promise<CareTeam | null>;
  /** For a signed-in patient: their own prescriptions, active first. */
  getMyMedications(ctx: ApiContext): Promise<Medication[]>;

  /** Doctor only, for their own patients. 409 if the same drug is already active. */
  prescribe(ctx: ApiContext, patientId: string, rx: NewPrescription): Promise<Medication>;
  /** 409 if already discontinued. */
  discontinueMedication(ctx: ApiContext, patientId: string, medicationId: string): Promise<Medication>;

  listMessages(ctx: ApiContext, patientId: string): Promise<Message[]>;
  sendMessage(ctx: ApiContext, patientId: string, body: string): Promise<Message>;

  startCall(ctx: ApiContext, patientId: string, kind: CallKind): Promise<Call>;
  updateCall(ctx: ApiContext, callId: string, action: CallAction, failed?: boolean): Promise<Call>;
  signal(ctx: ApiContext, callId: string, data: SignalData): Promise<void>;
  /** STUN/TURN servers for a call the user takes part in. 409 once the call has ended. */
  getIceServers(ctx: ApiContext, callId: string): Promise<RTCIceServer[]>;

  /** Opens the caller's Server-Sent Events stream; the response body is the raw stream. */
  openEvents(ctx: ApiContext, signal: AbortSignal): Promise<Response>;
}

export const api: ClinicApi = httpApi();

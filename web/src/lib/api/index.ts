import "server-only";
import type {
  AuthResult,
  CareTeam,
  Patient,
  PatientQuery,
  PatientSummary,
} from "@/lib/types";
import { httpApi } from "./http";
import { mockApi } from "./mock";

/** Identifies the caller on every data request. */
export interface ApiContext {
  userId: string;
  accessToken: string;
}

export interface ClinicApi {
  login(email: string, password: string): Promise<AuthResult | null>;
  listPatients(ctx: ApiContext, query?: PatientQuery): Promise<PatientSummary[]>;
  getPatient(ctx: ApiContext, id: string): Promise<Patient | null>;
  /** For a signed-in patient: themselves and their assigned doctor. */
  getCareTeam(ctx: ApiContext): Promise<CareTeam | null>;
}

// Talk to the NestJS API when API_URL is configured; otherwise use in-memory demo data.
export const api: ClinicApi = process.env.API_URL ? httpApi(process.env.API_URL) : mockApi;

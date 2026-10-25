import type { Doctor, Patient, PatientStatus } from '../common/types.js';

export interface PatientFilter {
  q?: string;
  status?: PatientStatus;
}

/** Doctors and patients. Implemented by Postgres (prisma/) and in memory for tests (memory/). */
export abstract class PatientsRepository {
  abstract findDoctor(id: string): Promise<Doctor | null>;

  abstract findPatient(id: string): Promise<Patient | null>;

  /** The doctor's patients, ordered by id. `q` matches name, id or a condition (case-insensitive). */
  abstract listForDoctor(
    doctorId: string,
    filter?: PatientFilter,
  ): Promise<Patient[]>;
}

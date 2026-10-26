import type {
  Doctor,
  Medication,
  Patient,
  PatientStatus,
} from '../common/types.js';

export interface PatientFilter {
  q?: string;
  status?: PatientStatus;
}

/** Doctors, patients and their records. Implemented by Postgres (prisma/) and in memory for tests (memory/). */
export abstract class PatientsRepository {
  abstract findDoctor(id: string): Promise<Doctor | null>;

  abstract findPatient(id: string): Promise<Patient | null>;

  /** The doctor's patients, ordered by id. `q` matches name, id or a condition (case-insensitive). */
  abstract listForDoctor(
    doctorId: string,
    filter?: PatientFilter,
  ): Promise<Patient[]>;

  abstract findMedication(
    patientId: string,
    medicationId: string,
  ): Promise<Medication | null>;

  abstract addMedication(
    patientId: string,
    medication: Medication,
  ): Promise<Medication>;

  /** Marks the medication discontinued as of `endedOn`. It must exist. */
  abstract discontinueMedication(
    medicationId: string,
    endedOn: string,
  ): Promise<Medication>;
}

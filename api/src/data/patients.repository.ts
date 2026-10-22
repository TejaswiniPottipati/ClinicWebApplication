import { Injectable } from '@nestjs/common';
import type { Doctor, Patient, PatientStatus } from '../common/types.js';
import { doctors, patients } from './mock-data.js';

export interface PatientFilter {
  q?: string;
  status?: PatientStatus;
}

/** Doctors and patients. In-memory for now; the queries map one-to-one onto a database later. */
@Injectable()
export class PatientsRepository {
  async findDoctor(id: string): Promise<Doctor | null> {
    return doctors.find((d) => d.id === id) ?? null;
  }

  async findPatient(id: string): Promise<Patient | null> {
    return patients.find((p) => p.id === id) ?? null;
  }

  async listForDoctor(
    doctorId: string,
    filter: PatientFilter = {},
  ): Promise<Patient[]> {
    const q = filter.q?.trim().toLowerCase();
    return patients.filter(
      (p) =>
        p.doctorId === doctorId &&
        (!filter.status || p.status === filter.status) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.conditions.some((c) => c.toLowerCase().includes(q))),
    );
  }
}

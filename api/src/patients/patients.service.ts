import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/auth.decorators.js';
import type {
  CareTeam,
  Conversation,
  Patient,
  PatientSummary,
} from '../common/types.js';
import {
  PatientsRepository,
  type PatientFilter,
} from '../data/patients.repository.js';

function toSummary(p: Patient): PatientSummary {
  const {
    id,
    name,
    gender,
    dateOfBirth,
    status,
    conditions,
    lastVisit,
    nextAppointment,
  } = p;
  return {
    id,
    name,
    gender,
    dateOfBirth,
    status,
    conditions,
    lastVisit,
    nextAppointment,
  };
}

@Injectable()
export class PatientsService {
  constructor(private readonly repo: PatientsRepository) {}

  async listForDoctor(
    doctorId: string,
    filter: PatientFilter,
  ): Promise<PatientSummary[]> {
    return (await this.repo.listForDoctor(doctorId, filter)).map(toSummary);
  }

  /** A doctor may only open records of patients assigned to them; others look like 404s. */
  async getForDoctor(doctorId: string, patientId: string): Promise<Patient> {
    const patient = await this.repo.findPatient(patientId);
    if (!patient || patient.doctorId !== doctorId)
      throw new NotFoundException('Patient not found.');
    return patient;
  }

  async getCareTeam(patientId: string): Promise<CareTeam> {
    const patient = await this.repo.findPatient(patientId);
    const doctor = patient && (await this.repo.findDoctor(patient.doctorId));
    if (!patient || !doctor) throw new NotFoundException('Patient not found.');
    return {
      patient: { id: patient.id, name: patient.name },
      doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
    };
  }

  /**
   * The conversation with `patientId`, if the caller is part of it: the patient's own doctor,
   * or the patient themselves. Used to authorize messaging and calls.
   */
  async resolveConversation(
    user: AuthUser,
    patientId: string,
  ): Promise<Conversation> {
    const patient = await this.repo.findPatient(patientId);
    const allowed =
      patient &&
      (user.role === 'doctor'
        ? patient.doctorId === user.id
        : patient.id === user.id);
    const doctor = allowed && (await this.repo.findDoctor(patient.doctorId));
    if (!patient || !doctor)
      throw new NotFoundException('Conversation not found.');
    return {
      doctor: { id: doctor.id, name: doctor.name },
      patient: { id: patient.id, name: patient.name },
    };
  }
}

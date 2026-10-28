import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../common/auth.decorators.js';
import type {
  CareTeam,
  Conversation,
  Medication,
  MedicationRoute,
  Patient,
  PatientSummary,
} from '../common/types.js';
import {
  PatientsRepository,
  type PatientFilter,
} from '../data/patients.repository.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export interface NewPrescription {
  name: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  instructions?: string;
  startedOn?: string; // ISO date; defaults to today
}

/** Today's date as "YYYY-MM-DD" (UTC). */
const today = () => new Date().toISOString().slice(0, 10);

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
  constructor(
    private readonly repo: PatientsRepository,
    private readonly realtime: RealtimeService,
  ) {}

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

  /** Adds a prescription to one of the doctor's patients. */
  async prescribe(
    doctor: AuthUser,
    patientId: string,
    rx: NewPrescription,
  ): Promise<Medication> {
    const patient = await this.getForDoctor(doctor.id, patientId);
    const duplicate = patient.medications.find(
      (m) =>
        m.status === 'active' && m.name.toLowerCase() === rx.name.toLowerCase(),
    );
    if (duplicate) {
      throw new ConflictException(
        `${duplicate.name} is already an active medication. Discontinue it first to change the prescription.`,
      );
    }
    const medication = await this.repo.addMedication(patient.id, {
      id: randomUUID(),
      name: rx.name,
      dosage: rx.dosage,
      frequency: rx.frequency,
      route: rx.route,
      instructions: rx.instructions || null,
      status: 'active',
      startedOn: rx.startedOn ?? today(),
      endedOn: null,
      prescribedBy: { id: doctor.id, name: doctor.name },
    });
    return this.notifyPatient(patient.id, medication);
  }

  /** Stops an active medication; it stays on the record as history. */
  async discontinue(
    doctor: AuthUser,
    patientId: string,
    medicationId: string,
  ): Promise<Medication> {
    await this.getForDoctor(doctor.id, patientId);
    const medication = await this.repo.findMedication(patientId, medicationId);
    if (!medication) throw new NotFoundException('Medication not found.');
    if (medication.status !== 'active')
      throw new ConflictException('This medication is already discontinued.');
    // Never before it started (a prescription dated in the future, stopped today).
    const endedOn =
      today() < medication.startedOn ? medication.startedOn : today();
    const stopped = await this.repo.discontinueMedication(
      medication.id,
      endedOn,
    );
    return this.notifyPatient(patientId, stopped);
  }

  /** For a signed-in patient: their own prescriptions, active first, then history. */
  async getMyMedications(patientId: string): Promise<Medication[]> {
    const patient = await this.repo.findPatient(patientId);
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient.medications;
  }

  /** Lets the patient's open portal show a prescription change straight away. */
  private notifyPatient(patientId: string, medication: Medication) {
    this.realtime.publish([{ role: 'patient', id: patientId }], {
      type: 'medication',
      medication,
    });
    return medication;
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

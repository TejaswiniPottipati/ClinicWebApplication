import { Injectable } from '@nestjs/common';
import type {
  Call,
  Doctor,
  Medication,
  Message,
  Participant,
  Patient,
} from '../../common/types.js';
import { CallsRepository } from '../calls.repository.js';
import { MessagesRepository } from '../messages.repository.js';
import {
  PatientsRepository,
  type PatientFilter,
} from '../patients.repository.js';
import { UsersRepository, type UserRecord } from '../users.repository.js';
import {
  callInclude,
  doctorInclude,
  medicationInclude,
  messageInclude,
  patientInclude,
  toCall,
  toDate,
  toDbStatus,
  toDoctor,
  toMedication,
  toMessage,
  toPatient,
} from './mappers.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash,
        }
      : null;
  }
}

@Injectable()
export class PrismaPatientsRepository extends PatientsRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async findDoctor(id: string): Promise<Doctor | null> {
    const row = await this.db.doctor.findUnique({
      where: { id },
      include: doctorInclude,
    });
    return row && toDoctor(row);
  }

  async findPatient(id: string): Promise<Patient | null> {
    const row = await this.db.patient.findUnique({
      where: { id },
      include: patientInclude,
    });
    return row && toPatient(row);
  }

  async listForDoctor(
    doctorId: string,
    filter: PatientFilter = {},
  ): Promise<Patient[]> {
    const q = filter.q?.trim();
    const match = { contains: q, mode: 'insensitive' } as const;
    const rows = await this.db.patient.findMany({
      where: {
        doctorId,
        ...(filter.status && { status: toDbStatus(filter.status) }),
        ...(q && {
          OR: [
            { user: { name: match } },
            { id: match },
            { conditions: { some: { name: match } } },
          ],
        }),
      },
      include: patientInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toPatient);
  }

  async findMedication(
    patientId: string,
    medicationId: string,
  ): Promise<Medication | null> {
    const row = await this.db.medication.findFirst({
      where: { id: medicationId, patientId },
      include: medicationInclude,
    });
    return row && toMedication(row);
  }

  async addMedication(patientId: string, m: Medication): Promise<Medication> {
    const row = await this.db.medication.create({
      data: {
        id: m.id,
        patientId,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        instructions: m.instructions,
        status: m.status,
        startedOn: toDate(m.startedOn),
        endedOn: m.endedOn ? toDate(m.endedOn) : null,
        prescribedById: m.prescribedBy.id,
      },
      include: medicationInclude,
    });
    return toMedication(row);
  }

  async discontinueMedication(
    medicationId: string,
    endedOn: string,
  ): Promise<Medication> {
    const row = await this.db.medication.update({
      where: { id: medicationId },
      data: { status: 'discontinued', endedOn: toDate(endedOn) },
      include: medicationInclude,
    });
    return toMedication(row);
  }
}

@Injectable()
export class PrismaMessagesRepository extends MessagesRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async listForPatient(patientId: string): Promise<Message[]> {
    const rows = await this.db.message.findMany({
      where: { patientId },
      include: messageInclude,
      orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toMessage);
  }

  async create(message: Message): Promise<Message> {
    await this.db.message.create({
      data: {
        id: message.id,
        patientId: message.patientId,
        doctorId: message.doctorId,
        sender: message.sender,
        body: message.body,
        sentAt: new Date(message.sentAt),
        callId: message.call?.id,
      },
    });
    return message;
  }
}

const liveFor = (p: Participant) => ({
  ...(p.role === 'doctor' ? { doctorId: p.id } : { patientId: p.id }),
  status: { not: 'ended' as const },
});

@Injectable()
export class PrismaCallsRepository extends CallsRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Call | null> {
    const row = await this.db.call.findUnique({
      where: { id },
      include: callInclude,
    });
    return row && toCall(row);
  }

  async findLive(p: Participant): Promise<Call | null> {
    const row = await this.db.call.findFirst({
      where: liveFor(p),
      include: callInclude,
    });
    return row && toCall(row);
  }

  async save(call: Call): Promise<Call> {
    const state = {
      status: call.status,
      endReason: call.endReason ?? null,
      answeredAt: call.answeredAt ? new Date(call.answeredAt) : null,
      endedAt: call.endedAt ? new Date(call.endedAt) : null,
    };
    await this.db.call.upsert({
      where: { id: call.id },
      create: {
        id: call.id,
        doctorId: call.doctorId,
        patientId: call.patientId,
        kind: call.kind,
        createdAt: new Date(call.createdAt),
        ...state,
      },
      update: state,
    });
    return call;
  }

  async failLive(endedAt: string): Promise<Call[]> {
    return this.db.$transaction(async (tx) => {
      const live = await tx.call.findMany({
        where: { status: { not: 'ended' } },
        select: { id: true },
      });
      const ids = live.map((c) => c.id);
      await tx.call.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'ended',
          endReason: 'failed',
          endedAt: new Date(endedAt),
        },
      });
      const rows = await tx.call.findMany({
        where: { id: { in: ids } },
        include: callInclude,
      });
      return rows.map(toCall);
    });
  }
}

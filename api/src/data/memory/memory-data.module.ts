import { Global, Injectable, Module, type OnModuleInit } from '@nestjs/common';
import { hashPassword } from '../../common/password.js';
import type { Call, Doctor, Message, Participant } from '../../common/types.js';
import { CallsRepository } from '../calls.repository.js';
import { MessagesRepository } from '../messages.repository.js';
import { DEMO_PASSWORD, doctors, messages, patients } from '../mock-data.js';
import {
  PatientsRepository,
  type PatientFilter,
} from '../patients.repository.js';
import { UsersRepository, type UserRecord } from '../users.repository.js';

// In-memory repositories over mock-data.ts, for tests: every test module starts from the same
// demo data and nothing touches a database. Use in place of DataModule:
//   Test.createTestingModule({ imports: [AppModule] }).overrideModule(DataModule).useModule(MemoryDataModule)

@Injectable()
export class MemoryUsersRepository
  extends UsersRepository
  implements OnModuleInit
{
  private users: UserRecord[] = [];

  async onModuleInit() {
    // Every demo account shares one password, so hashing it once is enough.
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    this.users = [
      ...doctors.map((d) => ({ ...d, role: 'doctor' as const })),
      ...patients.map((p) => ({ ...p, role: 'patient' as const })),
    ].map(({ id, name, email, role }) => ({
      id,
      name,
      email,
      role,
      passwordHash,
    }));
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }
}

@Injectable()
export class MemoryPatientsRepository extends PatientsRepository {
  async findDoctor(id: string): Promise<Doctor | null> {
    return doctors.find((d) => d.id === id) ?? null;
  }

  async findPatient(id: string) {
    return patients.find((p) => p.id === id) ?? null;
  }

  async listForDoctor(doctorId: string, filter: PatientFilter = {}) {
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

@Injectable()
export class MemoryMessagesRepository extends MessagesRepository {
  private readonly messages: Message[] = messages.map((m) => ({ ...m }));

  async listForPatient(patientId: string): Promise<Message[]> {
    return this.messages
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  async create(message: Message): Promise<Message> {
    this.messages.push(message);
    return message;
  }
}

@Injectable()
export class MemoryCallsRepository extends CallsRepository {
  private readonly calls = new Map<string, Call>();

  async findById(id: string): Promise<Call | null> {
    return this.calls.get(id) ?? null;
  }

  async findLive(p: Participant): Promise<Call | null> {
    for (const call of this.calls.values()) {
      const involved =
        p.role === 'doctor' ? call.doctorId === p.id : call.patientId === p.id;
      if (involved && call.status !== 'ended') return call;
    }
    return null;
  }

  async save(call: Call): Promise<Call> {
    this.calls.set(call.id, call);
    return call;
  }

  async failLive(endedAt: string): Promise<Call[]> {
    const live = [...this.calls.values()].filter((c) => c.status !== 'ended');
    return Promise.all(
      live.map((c) =>
        this.save({ ...c, status: 'ended', endReason: 'failed', endedAt }),
      ),
    );
  }
}

const repositories = [
  { provide: UsersRepository, useClass: MemoryUsersRepository },
  { provide: PatientsRepository, useClass: MemoryPatientsRepository },
  { provide: MessagesRepository, useClass: MemoryMessagesRepository },
  { provide: CallsRepository, useClass: MemoryCallsRepository },
];

@Global()
@Module({
  providers: repositories,
  exports: repositories.map((r) => r.provide),
})
export class MemoryDataModule {}

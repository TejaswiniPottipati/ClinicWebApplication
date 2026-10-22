import { Injectable, type OnModuleInit } from '@nestjs/common';
import { hashPassword } from '../common/password.js';
import type { User } from '../common/types.js';
import { DEMO_PASSWORD, doctors, patients } from './mock-data.js';

export interface UserRecord extends User {
  passwordHash: string;
}

/** Login accounts. In-memory for now; a users table later. A user's id is their doctor or patient id. */
@Injectable()
export class UsersRepository implements OnModuleInit {
  private users: UserRecord[] = [];

  async onModuleInit() {
    // Every demo account shares one password, so hashing it once is enough.
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    this.users = [
      ...doctors.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        role: 'doctor' as const,
        passwordHash,
      })),
      ...patients.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: 'patient' as const,
        passwordHash,
      })),
    ];
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }
}

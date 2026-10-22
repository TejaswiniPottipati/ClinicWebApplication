import { Injectable } from '@nestjs/common';
import type { Call, Participant } from '../common/types.js';

/** Call records. In-memory: resets when the API restarts. */
@Injectable()
export class CallsRepository {
  private readonly calls = new Map<string, Call>();

  async findById(id: string): Promise<Call | null> {
    return this.calls.get(id) ?? null;
  }

  /** The ringing or active call this participant is in, if any. */
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
}

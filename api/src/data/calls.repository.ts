import type { Call, Participant } from '../common/types.js';

/** Call records. */
export abstract class CallsRepository {
  abstract findById(id: string): Promise<Call | null>;

  /** The ringing or active call this participant is in, if any. */
  abstract findLive(p: Participant): Promise<Call | null>;

  /** Creates or updates the call. */
  abstract save(call: Call): Promise<Call>;

  /** Ends every ringing or active call as failed and returns them. */
  abstract failLive(endedAt: string): Promise<Call[]>;
}

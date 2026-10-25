import type { Message } from '../common/types.js';

/** Conversation history, keyed by patient. */
export abstract class MessagesRepository {
  /** Oldest first. */
  abstract listForPatient(patientId: string): Promise<Message[]>;

  /** `message.call`, if set, must refer to a saved call. */
  abstract create(message: Message): Promise<Message>;
}

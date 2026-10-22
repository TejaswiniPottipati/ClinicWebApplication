import { Injectable } from '@nestjs/common';
import type { Message } from '../common/types.js';
import { messages as seed } from './mock-data.js';

/** Conversation history, keyed by patient. In-memory: resets when the API restarts. */
@Injectable()
export class MessagesRepository {
  private readonly messages: Message[] = seed.map((m) => ({ ...m }));

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

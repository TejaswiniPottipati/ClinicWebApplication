import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../common/auth.decorators.js';
import type { Call, Message } from '../common/types.js';
import { MessagesRepository } from '../data/messages.repository.js';
import { PatientsService } from '../patients/patients.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly repo: MessagesRepository,
    private readonly patients: PatientsService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(user: AuthUser, patientId: string): Promise<Message[]> {
    await this.patients.resolveConversation(user, patientId);
    return this.repo.listForPatient(patientId);
  }

  async send(
    user: AuthUser,
    patientId: string,
    body: string,
  ): Promise<Message> {
    const conversation = await this.patients.resolveConversation(
      user,
      patientId,
    );
    return this.deliver({
      id: randomUUID(),
      patientId: conversation.patient.id,
      doctorId: conversation.doctor.id,
      sender: user.role,
      body,
      sentAt: new Date().toISOString(),
    });
  }

  /** Records a finished call in the conversation ("Missed video call", "Audio call", ...). */
  async logCall(call: Call): Promise<Message> {
    const kind = call.kind === 'video' ? 'Video call' : 'Audio call';
    const body =
      call.endReason === 'missed'
        ? `Missed ${kind.toLowerCase()}`
        : call.endReason === 'declined'
          ? `${kind} declined`
          : call.endReason === 'cancelled'
            ? `${kind} cancelled`
            : call.answeredAt
              ? kind
              : `${kind} failed`;

    return this.deliver({
      id: randomUUID(),
      patientId: call.patientId,
      doctorId: call.doctorId,
      sender: 'doctor', // the doctor always places calls
      body,
      sentAt: call.endedAt ?? new Date().toISOString(),
      call: {
        id: call.id,
        kind: call.kind,
        endReason: call.endReason,
        answeredAt: call.answeredAt,
        endedAt: call.endedAt,
      },
    });
  }

  private async deliver(message: Message): Promise<Message> {
    await this.repo.create(message);
    this.realtime.publish(
      [
        { role: 'doctor', id: message.doctorId },
        { role: 'patient', id: message.patientId },
      ],
      { type: 'message', message },
    );
    return message;
  }
}

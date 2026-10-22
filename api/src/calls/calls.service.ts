import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../common/auth.decorators.js';
import type {
  Call,
  CallEndReason,
  CallKind,
  Participant,
  SignalData,
} from '../common/types.js';
import { CallsRepository } from '../data/calls.repository.js';
import { MessagesService } from '../messages/messages.service.js';
import { PatientsService } from '../patients/patients.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export const RING_TIMEOUT_MS = 30_000;

const isParticipant = (call: Call, user: AuthUser) =>
  user.role === 'doctor'
    ? call.doctorId === user.id
    : call.patientId === user.id;

const participants = (call: Call): Participant[] => [
  { role: 'doctor', id: call.doctorId },
  { role: 'patient', id: call.patientId },
];

/**
 * Call lifecycle: ringing → active → ended. Doctors place calls; patients answer or decline;
 * either side can hang up. The server only relays WebRTC signaling; media is peer to peer.
 */
@Injectable()
export class CallsService implements OnModuleDestroy {
  private readonly ringTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  // State changes to one call run one at a time, so e.g. an accept can't interleave with the ring timeout.
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly repo: CallsRepository,
    private readonly patients: PatientsService,
    private readonly messages: MessagesService,
    private readonly realtime: RealtimeService,
  ) {
    // Someone who connects mid-ring (e.g. opening the portal) still sees the incoming call.
    realtime.onConnect(async (p) => {
      const live = await repo.findLive(p);
      return live ? [{ type: 'call', call: live }] : [];
    });
    // Someone who has vanished (closed the tab, lost the network) can't continue their call.
    realtime.onDisconnect(async (p) => {
      const live = await repo.findLive(p);
      if (live)
        await this.withLock(live.id, () => this.finish(live.id, 'failed'));
    });
  }

  async start(
    user: AuthUser,
    patientId: string,
    kind: CallKind,
  ): Promise<Call> {
    const conversation = await this.patients.resolveConversation(
      user,
      patientId,
    );
    return this.withLock(`start:${conversation.doctor.id}`, async () => {
      if (
        await this.repo.findLive({ role: 'doctor', id: conversation.doctor.id })
      ) {
        throw new ConflictException("You're already in a call.");
      }
      if (
        await this.repo.findLive({
          role: 'patient',
          id: conversation.patient.id,
        })
      ) {
        throw new ConflictException('This patient is already in a call.');
      }

      const call = await this.repo.save({
        id: randomUUID(),
        doctorId: conversation.doctor.id,
        patientId: conversation.patient.id,
        doctorName: conversation.doctor.name,
        patientName: conversation.patient.name,
        kind,
        status: 'ringing',
        createdAt: new Date().toISOString(),
      });
      this.realtime.publish(participants(call), { type: 'call', call });

      const timer = setTimeout(() => {
        void this.withLock(call.id, async () => {
          if ((await this.repo.findById(call.id))?.status === 'ringing')
            await this.finish(call.id, 'missed');
        });
      }, RING_TIMEOUT_MS);
      timer.unref();
      this.ringTimers.set(call.id, timer);
      return call;
    });
  }

  accept(user: AuthUser, callId: string): Promise<Call> {
    return this.withLock(callId, async () => {
      const call = await this.findFor(user, callId);
      if (call.status !== 'ringing')
        throw new ConflictException('This call is no longer ringing.');
      this.clearRing(callId);
      return this.update(call, {
        status: 'active',
        answeredAt: new Date().toISOString(),
      });
    });
  }

  decline(user: AuthUser, callId: string): Promise<Call> {
    return this.withLock(callId, async () => {
      const call = await this.findFor(user, callId);
      if (call.status !== 'ringing')
        throw new ConflictException('This call is no longer ringing.');
      return this.finish(callId, 'declined');
    });
  }

  /** Hang up. Works in any state: a caller hanging up while ringing cancels the call. */
  end(user: AuthUser, callId: string, failed = false): Promise<Call> {
    return this.withLock(callId, async () => {
      const call = await this.findFor(user, callId);
      if (call.status === 'ended') return call;
      const reason: CallEndReason = failed
        ? 'failed'
        : call.status === 'active'
          ? 'completed'
          : user.role === 'doctor'
            ? 'cancelled'
            : 'declined';
      return this.finish(callId, reason);
    });
  }

  /** Forwards a WebRTC offer/answer/ICE candidate to the other participant. */
  async signal(
    user: AuthUser,
    callId: string,
    data: SignalData,
  ): Promise<void> {
    const call = await this.findFor(user, callId);
    // Trailing ICE candidates routinely arrive just after a hang-up; there's no one to deliver them to.
    if (call.status === 'ended') return;
    if (call.status !== 'active')
      throw new ConflictException('Call is not active.');
    const to: Participant =
      user.role === 'doctor'
        ? { role: 'patient', id: call.patientId }
        : { role: 'doctor', id: call.doctorId };
    this.realtime.publish([to], { type: 'signal', callId, data });
  }

  onModuleDestroy() {
    this.ringTimers.forEach(clearTimeout);
  }

  private async findFor(user: AuthUser, callId: string): Promise<Call> {
    const call = await this.repo.findById(callId);
    // Other people's calls are indistinguishable from missing ones.
    if (!call || !isParticipant(call, user))
      throw new NotFoundException('Call not found.');
    return call;
  }

  private async update(call: Call, patch: Partial<Call>): Promise<Call> {
    const next = await this.repo.save({ ...call, ...patch });
    this.realtime.publish(participants(next), { type: 'call', call: next });
    return next;
  }

  /** Ends the call (if not already ended) and logs it in the conversation. Call within the call's lock. */
  private async finish(
    callId: string,
    endReason: CallEndReason,
  ): Promise<Call> {
    const call = await this.repo.findById(callId);
    if (!call) throw new NotFoundException('Call not found.');
    if (call.status === 'ended') return call;
    this.clearRing(callId);
    const ended = await this.update(call, {
      status: 'ended',
      endReason,
      endedAt: new Date().toISOString(),
    });
    await this.messages.logCall(ended);
    return ended;
  }

  private clearRing(callId: string) {
    clearTimeout(this.ringTimers.get(callId));
    this.ringTimers.delete(callId);
  }

  private withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const result = previous.then(fn, fn);
    const settled = result.catch(() => {});
    this.locks.set(key, settled);
    void settled.then(() => {
      if (this.locks.get(key) === settled) this.locks.delete(key);
    });
    return result;
  }
}

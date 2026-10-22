import { Test } from '@nestjs/testing';
import type { AuthUser } from '../common/auth.decorators.js';
import type { RealtimeEvent } from '../common/types.js';
import { DataModule } from '../data/data.module.js';
import { MessagesRepository } from '../data/messages.repository.js';
import { MessagesService } from '../messages/messages.service.js';
import { PatientsService } from '../patients/patients.service.js';
import {
  DISCONNECT_GRACE_MS,
  RealtimeService,
} from '../realtime/realtime.service.js';
import { CallsService, RING_TIMEOUT_MS } from './calls.service.js';

const doctor: AuthUser = { id: 'doc-1', role: 'doctor', name: 'Dr. Anita Rao' };
const patient: AuthUser = {
  id: 'P-1001',
  role: 'patient',
  name: 'Aarav Johnson',
};

describe('CallsService timers and concurrency', () => {
  let calls: CallsService;
  let realtime: RealtimeService;
  let messages: MessagesRepository;

  beforeEach(async () => {
    vi.useFakeTimers();
    const moduleRef = await Test.createTestingModule({
      imports: [DataModule],
      providers: [
        CallsService,
        MessagesService,
        PatientsService,
        RealtimeService,
      ],
    }).compile();
    calls = moduleRef.get(CallsService);
    realtime = moduleRef.get(RealtimeService);
    messages = moduleRef.get(MessagesRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const lastLog = async () => (await messages.listForPatient('P-1001')).at(-1);

  it('marks an unanswered call as missed after the ring timeout', async () => {
    const call = await calls.start(doctor, 'P-1001', 'audio');
    await vi.advanceTimersByTimeAsync(RING_TIMEOUT_MS - 1);
    expect((await lastLog())?.call).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(await lastLog()).toMatchObject({
      body: 'Missed audio call',
      call: { id: call.id, endReason: 'missed' },
    });
  });

  it('does not time out a call that was answered', async () => {
    const call = await calls.start(doctor, 'P-1001', 'video');
    await calls.accept(patient, call.id);
    await vi.advanceTimersByTimeAsync(RING_TIMEOUT_MS * 2);
    expect((await lastLog())?.call).toBeUndefined();
    await calls.end(doctor, call.id);
  });

  it('ends the call as failed when a participant stays disconnected', async () => {
    const call = await calls.start(doctor, 'P-1001', 'video');
    const stream = realtime
      .stream({ role: 'patient', id: 'P-1001' })
      .subscribe();
    await calls.accept(patient, call.id);

    stream.unsubscribe();
    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS);
    expect(await lastLog()).toMatchObject({
      call: { id: call.id, endReason: 'failed' },
    });
  });

  it('keeps the call if the participant reconnects within the grace period', async () => {
    const call = await calls.start(doctor, 'P-1001', 'video');
    await calls.accept(patient, call.id);
    realtime
      .stream({ role: 'patient', id: 'P-1001' })
      .subscribe()
      .unsubscribe();
    const events: RealtimeEvent[] = [];
    const again = realtime
      .stream({ role: 'patient', id: 'P-1001' })
      .subscribe((e) => events.push(e));

    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS * 2);
    expect((await lastLog())?.call).toBeUndefined();
    expect(events).toEqual([
      {
        type: 'call',
        call: expect.objectContaining({ id: call.id, status: 'active' }),
      },
    ]);
    again.unsubscribe();
    await calls.end(doctor, call.id);
  });

  it('applies concurrent accept and decline one at a time', async () => {
    const call = await calls.start(doctor, 'P-1001', 'audio');
    const results = await Promise.allSettled([
      calls.accept(patient, call.id),
      calls.decline(patient, call.id),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    await calls.end(doctor, call.id);
    const logs = (await messages.listForPatient('P-1001')).filter(
      (m) => m.call?.id === call.id,
    );
    expect(logs).toHaveLength(1);
  });
});

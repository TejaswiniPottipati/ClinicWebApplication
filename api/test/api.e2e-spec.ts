import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { Call, Message, RealtimeEvent } from '../src/common/types.js';
import { configureApp } from '../src/setup.js';

process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';

const PASSWORD = 'Password123!';
// Dr. Rao (doc-1) treats P-1001..P-1020; Dr. Okafor (doc-2) treats P-1021..P-1040.
const PHYSICIAN = 'physician@clinic.test';
const SURGEON = 'surgeon@clinic.test';
const PATIENT = 'aarav.johnson@mail.test'; // P-1001

let app: INestApplication;
let baseUrl: string;
const tokens: Record<string, string> = {};

const api = () => request(app.getHttpServer());
const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

/** Opens the SSE stream for a user and collects the JSON events it delivers. */
async function openStream(who: string) {
  const events: RealtimeEvent[] = [];
  const controller = new AbortController();
  const res = await fetch(`${baseUrl}/events`, {
    headers: auth(who),
    signal: controller.signal,
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('text/event-stream');

  void (async () => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (/^event: ping$/m.test(block)) continue;
          const data = block.match(/^data: (.*)$/m)?.[1];
          if (data) events.push(JSON.parse(data) as RealtimeEvent);
        }
      }
    } catch {
      // aborted
    }
  })();

  return { events, close: () => controller.abort() };
}

const until = async (check: () => boolean, ms = 2000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('Timed out waiting for event');
    await new Promise((r) => setTimeout(r, 20));
  }
};

const lastCall = (events: RealtimeEvent[]) =>
  events.filter((e) => e.type === 'call').at(-1)?.call;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.listen(0);
  baseUrl = await app.getUrl();
  baseUrl = baseUrl.replace('[::1]', 'localhost');

  for (const email of [PHYSICIAN, SURGEON, PATIENT]) {
    const res = await api()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    tokens[email] = res.body.accessToken;
  }
});

afterAll(async () => {
  await app.close();
});

describe('auth', () => {
  it('returns the user and a token', async () => {
    const res = await api()
      .post('/auth/login')
      .send({ email: PATIENT, password: PASSWORD })
      .expect(200);
    expect(res.body.user).toEqual({
      id: 'P-1001',
      name: 'Aarav Johnson',
      email: PATIENT,
      role: 'patient',
    });
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects a wrong password and an unknown email the same way', async () => {
    const wrong = await api()
      .post('/auth/login')
      .send({ email: PHYSICIAN, password: 'nope' })
      .expect(401);
    const unknown = await api()
      .post('/auth/login')
      .send({ email: 'who@clinic.test', password: PASSWORD })
      .expect(401);
    expect(wrong.body.message).toBe('Invalid email or password.');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('validates the request body', async () => {
    const res = await api()
      .post('/auth/login')
      .send({ email: 'not-an-email' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['Enter a valid email address.']),
    );
  });

  it('requires a valid token everywhere else', async () => {
    await api().get('/patients').expect(401);
    await api()
      .get('/patients')
      .set('Authorization', 'Bearer forged.token.value')
      .expect(401);
    await api().get('/health').expect(200, { status: 'ok' });
  });
});

describe('patients', () => {
  it("lists only the doctor's own patients", async () => {
    const rao = await api().get('/patients').set(auth(PHYSICIAN)).expect(200);
    const okafor = await api().get('/patients').set(auth(SURGEON)).expect(200);
    expect(rao.body).toHaveLength(20);
    expect(okafor.body).toHaveLength(20);
    expect(rao.body[0].id).toBe('P-1001');
    expect(okafor.body[0].id).toBe('P-1021');
    expect(rao.body[0]).not.toHaveProperty('medications'); // summaries only
  });

  it('filters by search text and status', async () => {
    const diabetes = await api()
      .get('/patients?q=diabetes')
      .set(auth(PHYSICIAN))
      .expect(200);
    const critical = await api()
      .get('/patients?status=Critical')
      .set(auth(PHYSICIAN))
      .expect(200);
    expect(diabetes.body).toHaveLength(4);
    expect(
      critical.body.every((p: { status: string }) => p.status === 'Critical'),
    ).toBe(true);
    await api().get('/patients?status=Sleepy').set(auth(PHYSICIAN)).expect(400);
  });

  it("hides other doctors' patients", async () => {
    const own = await api()
      .get('/patients/P-1001')
      .set(auth(PHYSICIAN))
      .expect(200);
    expect(own.body.medications).toEqual(expect.any(Array));
    await api().get('/patients/P-1021').set(auth(PHYSICIAN)).expect(404);
  });

  it('is for doctors only', async () => {
    await api().get('/patients').set(auth(PATIENT)).expect(403);
  });

  it('gives patients their care team', async () => {
    const res = await api().get('/me/care-team').set(auth(PATIENT)).expect(200);
    expect(res.body).toEqual({
      patient: { id: 'P-1001', name: 'Aarav Johnson' },
      doctor: { id: 'doc-1', name: 'Dr. Anita Rao', specialty: 'Physician' },
    });
    await api().get('/me/care-team').set(auth(PHYSICIAN)).expect(403);
  });
});

describe('messages', () => {
  const path = '/conversations/P-1001/messages';

  it('starts with a welcome message', async () => {
    const res = await api().get(path).set(auth(PATIENT)).expect(200);
    expect(res.body[0].body).toContain('this is Dr. Anita Rao');
  });

  it('delivers messages to both participants live', async () => {
    const doctorStream = await openStream(PHYSICIAN);
    const patientStream = await openStream(PATIENT);
    const surgeonStream = await openStream(SURGEON);

    const sent = await api()
      .post(path)
      .set(auth(PHYSICIAN))
      .send({ body: '  How are you feeling?  ' })
      .expect(201);
    expect(sent.body).toMatchObject({
      sender: 'doctor',
      body: 'How are you feeling?',
      patientId: 'P-1001',
    });
    await api()
      .post(path)
      .set(auth(PATIENT))
      .send({ body: 'Much better.' })
      .expect(201);

    const bodies = (events: RealtimeEvent[]) =>
      events
        .filter((e) => e.type === 'message')
        .map((e) => (e as { message: Message }).message.body);
    await until(
      () =>
        bodies(patientStream.events).length === 2 &&
        bodies(doctorStream.events).length === 2,
    );
    expect(bodies(patientStream.events)).toEqual([
      'How are you feeling?',
      'Much better.',
    ]);
    expect(surgeonStream.events).toHaveLength(0);

    for (const s of [doctorStream, patientStream, surgeonStream]) s.close();
  });

  it("can't be read or sent outside the conversation", async () => {
    await api()
      .get('/conversations/P-1021/messages')
      .set(auth(PHYSICIAN))
      .expect(404);
    await api()
      .get('/conversations/P-1002/messages')
      .set(auth(PATIENT))
      .expect(404);
    await api()
      .post('/conversations/P-1021/messages')
      .set(auth(PHYSICIAN))
      .send({ body: 'hi' })
      .expect(404);
  });

  it('rejects empty and unexpected input', async () => {
    await api().post(path).set(auth(PATIENT)).send({ body: '   ' }).expect(400);
    await api()
      .post(path)
      .set(auth(PATIENT))
      .send({ body: 'hi', sender: 'doctor' })
      .expect(400);
  });
});

describe('calls', () => {
  it('rings, connects, relays signals and ends', async () => {
    const doctorStream = await openStream(PHYSICIAN);
    const patientStream = await openStream(PATIENT);

    const started = await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1001', kind: 'video' })
      .expect(201);
    const call = started.body as Call;
    expect(call.status).toBe('ringing');
    await until(() => lastCall(patientStream.events)?.status === 'ringing');

    // Only one live call at a time, and only patients answer.
    await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1002', kind: 'audio' })
      .expect(409);
    await api()
      .post(`/calls/${call.id}/accept`)
      .set(auth(PHYSICIAN))
      .expect(403);
    await api()
      .post(`/calls/${call.id}/signal`)
      .set(auth(PHYSICIAN))
      .send({ type: 'offer', sdp: 'x' })
      .expect(409);

    await api().post(`/calls/${call.id}/accept`).set(auth(PATIENT)).expect(200);
    await until(() => lastCall(doctorStream.events)?.status === 'active');
    await api().post(`/calls/${call.id}/accept`).set(auth(PATIENT)).expect(409);

    await api()
      .post(`/calls/${call.id}/signal`)
      .set(auth(PHYSICIAN))
      .send({ type: 'offer', sdp: 'v=0 offer' })
      .expect(204);
    await api()
      .post(`/calls/${call.id}/signal`)
      .set(auth(PATIENT))
      .send({
        type: 'candidate',
        candidate: {
          candidate: 'candidate:1 1 udp 1 10.0.0.1 9 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
        },
      })
      .expect(204);
    await api()
      .post(`/calls/${call.id}/signal`)
      .set(auth(PATIENT))
      .send({ type: 'candidate' })
      .expect(400);

    const signals = (events: RealtimeEvent[]) =>
      events
        .filter((e) => e.type === 'signal')
        .map((e) => (e as { data: { type: string } }).data.type);
    await until(
      () =>
        signals(patientStream.events).length === 1 &&
        signals(doctorStream.events).length === 1,
    );
    expect(signals(patientStream.events)).toEqual(['offer']);
    expect(signals(doctorStream.events)).toEqual(['candidate']);

    // Strangers can't touch the call.
    await api()
      .post(`/calls/${call.id}/end`)
      .set(auth(SURGEON))
      .send({})
      .expect(404);

    await api()
      .post(`/calls/${call.id}/end`)
      .set(auth(PATIENT))
      .send({})
      .expect(200);
    await until(() => lastCall(doctorStream.events)?.endReason === 'completed');
    // Late ICE candidates after hang-up are accepted and dropped.
    await api()
      .post(`/calls/${call.id}/signal`)
      .set(auth(PHYSICIAN))
      .send({ type: 'candidate', candidate: { candidate: 'late' } })
      .expect(204);

    const log = await api()
      .get('/conversations/P-1001/messages')
      .set(auth(PATIENT))
      .expect(200);
    expect(log.body.at(-1)).toMatchObject({
      body: 'Video call',
      call: { id: call.id, endReason: 'completed' },
    });

    doctorStream.close();
    patientStream.close();
  });

  it('records declines and cancellations', async () => {
    const declined = await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1001', kind: 'audio' })
      .expect(201);
    const res = await api()
      .post(`/calls/${declined.body.id}/decline`)
      .set(auth(PATIENT))
      .expect(200);
    expect(res.body).toMatchObject({ status: 'ended', endReason: 'declined' });

    const cancelled = await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1001', kind: 'video' })
      .expect(201);
    const ended = await api()
      .post(`/calls/${cancelled.body.id}/end`)
      .set(auth(PHYSICIAN))
      .send({})
      .expect(200);
    expect(ended.body.endReason).toBe('cancelled');

    const log = await api()
      .get('/conversations/P-1001/messages')
      .set(auth(PHYSICIAN))
      .expect(200);
    expect(log.body.slice(-2).map((m: Message) => m.body)).toEqual([
      'Audio call declined',
      'Video call cancelled',
    ]);
  });

  it('replays a ringing call to someone who connects mid-ring', async () => {
    const started = await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1001', kind: 'video' })
      .expect(201);
    const patientStream = await openStream(PATIENT);
    await until(() => lastCall(patientStream.events)?.id === started.body.id);
    await api()
      .post(`/calls/${started.body.id}/end`)
      .set(auth(PHYSICIAN))
      .send({})
      .expect(200);
    patientStream.close();
  });

  it("can't call someone else's patient", async () => {
    await api()
      .post('/calls')
      .set(auth(PHYSICIAN))
      .send({ patientId: 'P-1021', kind: 'audio' })
      .expect(404);
    await api()
      .post('/calls')
      .set(auth(PATIENT))
      .send({ patientId: 'P-1001', kind: 'audio' })
      .expect(403);
  });
});

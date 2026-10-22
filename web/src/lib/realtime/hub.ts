import "server-only";
import { EventEmitter } from "node:events";
import type {
  Call,
  CallEndReason,
  CallKind,
  Message,
  RealtimeEvent,
  Role,
  SignalData,
} from "@/lib/types";

// In-memory messaging + call signaling hub.
//
// This stands in for the NestJS API until it exists (where it becomes a WebSocket gateway
// backed by a database). State lives in this server process only: it resets on restart and
// does not work across multiple server instances.

export interface Participant {
  role: Role;
  id: string;
}

/** The two people in a conversation. Each patient has exactly one doctor. */
export interface Conversation {
  doctor: { id: string; name: string };
  patient: { id: string; name: string };
}

const RING_TIMEOUT_MS = 30_000;
// How long a user may be fully disconnected (e.g. a page reload) before their live call is dropped.
const DISCONNECT_GRACE_MS = 5_000;

interface HubState {
  emitter: EventEmitter;
  messages: Map<string, Message[]>; // by patient id
  calls: Map<string, Call>;
  ringTimers: Map<string, ReturnType<typeof setTimeout>>;
}

// Kept on globalThis so dev-mode hot reloads don't wipe conversations mid-demo.
const g = globalThis as typeof globalThis & { __cwaHub?: HubState };
const hub = (g.__cwaHub ??= {
  emitter: new EventEmitter().setMaxListeners(0),
  messages: new Map(),
  calls: new Map(),
  ringTimers: new Map(),
});

const channel = (p: Participant) => `${p.role}:${p.id}`;
const now = () => new Date().toISOString();

function publish(c: { doctorId: string; patientId: string }, event: RealtimeEvent) {
  hub.emitter.emit(channel({ role: "doctor", id: c.doctorId }), event);
  hub.emitter.emit(channel({ role: "patient", id: c.patientId }), event);
}

function isParticipant(call: Call, p: Participant) {
  return p.role === "doctor" ? call.doctorId === p.id : call.patientId === p.id;
}

function liveCallFor(p: Participant) {
  for (const call of hub.calls.values()) {
    if (call.status !== "ended" && isParticipant(call, p)) return call;
  }
}

// ---- Subscriptions ---------------------------------------------------------------

export function subscribe(p: Participant, listener: (event: RealtimeEvent) => void) {
  const ch = channel(p);
  hub.emitter.on(ch, listener);

  // Bring a newly connected client up to date, e.g. a patient opening the portal while ringing.
  const live = liveCallFor(p);
  if (live) listener({ type: "call", call: live });

  return () => {
    hub.emitter.off(ch, listener);
    setTimeout(() => {
      if (hub.emitter.listenerCount(ch) > 0) return;
      const call = liveCallFor(p);
      if (call) endCall(call.id, p, "failed");
    }, DISCONNECT_GRACE_MS).unref?.();
  };
}

// ---- Messages --------------------------------------------------------------------

function thread(c: Conversation) {
  let messages = hub.messages.get(c.patient.id);
  if (!messages) {
    const firstName = c.patient.name.split(" ")[0];
    messages = [
      {
        id: crypto.randomUUID(),
        patientId: c.patient.id,
        doctorId: c.doctor.id,
        sender: "doctor",
        body: `Hi ${firstName}, this is ${c.doctor.name}. You can message me here with any questions about your care.`,
        sentAt: "2026-10-01T09:00:00.000Z",
      },
    ];
    hub.messages.set(c.patient.id, messages);
  }
  return messages;
}

export function listMessages(c: Conversation) {
  return [...thread(c)];
}

export function sendMessage(c: Conversation, sender: Role, body: string) {
  const message: Message = {
    id: crypto.randomUUID(),
    patientId: c.patient.id,
    doctorId: c.doctor.id,
    sender,
    body,
    sentAt: now(),
  };
  thread(c).push(message);
  publish(message, { type: "message", message });
  return message;
}

function logCall(call: Call) {
  const kind = call.kind === "video" ? "Video call" : "Audio call";
  const body =
    call.endReason === "missed" ? `Missed ${kind.toLowerCase()}`
    : call.endReason === "declined" ? `${kind} declined`
    : call.endReason === "cancelled" ? `${kind} cancelled`
    : call.answeredAt ? kind
    : `${kind} failed`;

  const message: Message = {
    id: crypto.randomUUID(),
    patientId: call.patientId,
    doctorId: call.doctorId,
    sender: "doctor",
    body,
    sentAt: call.endedAt ?? now(),
    call: {
      id: call.id,
      kind: call.kind,
      endReason: call.endReason,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
    },
  };
  thread({
    doctor: { id: call.doctorId, name: call.doctorName },
    patient: { id: call.patientId, name: call.patientName },
  }).push(message);
  publish(message, { type: "message", message });
}

// ---- Calls -----------------------------------------------------------------------

export type CallResult = { ok: true; call: Call } | { ok: false; error: string; status: number };

function update(call: Call, patch: Partial<Call>): Call {
  const next = { ...call, ...patch };
  hub.calls.set(call.id, next);
  publish(next, { type: "call", call: next });
  return next;
}

function clearRing(callId: string) {
  clearTimeout(hub.ringTimers.get(callId));
  hub.ringTimers.delete(callId);
}

/** Only doctors place calls; patients receive them. */
export function startCall(c: Conversation, kind: CallKind): CallResult {
  if (liveCallFor({ role: "doctor", id: c.doctor.id })) {
    return { ok: false, error: "You're already in a call.", status: 409 };
  }
  if (liveCallFor({ role: "patient", id: c.patient.id })) {
    return { ok: false, error: "This patient is already in a call.", status: 409 };
  }

  const call: Call = {
    id: crypto.randomUUID(),
    doctorId: c.doctor.id,
    patientId: c.patient.id,
    doctorName: c.doctor.name,
    patientName: c.patient.name,
    kind,
    status: "ringing",
    createdAt: now(),
  };
  hub.calls.set(call.id, call);
  publish(call, { type: "call", call });

  const timer = setTimeout(() => {
    const current = hub.calls.get(call.id);
    if (current?.status === "ringing") finish(current, "missed");
  }, RING_TIMEOUT_MS);
  timer.unref?.();
  hub.ringTimers.set(call.id, timer);

  return { ok: true, call };
}

function finish(call: Call, endReason: CallEndReason) {
  clearRing(call.id);
  const ended = update(call, { status: "ended", endReason, endedAt: now() });
  logCall(ended);
  return ended;
}

function findCall(callId: string, by: Participant): CallResult {
  const call = hub.calls.get(callId);
  if (!call || !isParticipant(call, by)) return { ok: false, error: "Call not found.", status: 404 };
  return { ok: true, call };
}

export function acceptCall(callId: string, by: Participant): CallResult {
  const found = findCall(callId, by);
  if (!found.ok) return found;
  if (by.role !== "patient") return { ok: false, error: "Only the callee can answer.", status: 403 };
  if (found.call.status !== "ringing") {
    return { ok: false, error: "This call is no longer ringing.", status: 409 };
  }
  clearRing(callId);
  return { ok: true, call: update(found.call, { status: "active", answeredAt: now() }) };
}

export function declineCall(callId: string, by: Participant): CallResult {
  const found = findCall(callId, by);
  if (!found.ok) return found;
  if (found.call.status !== "ringing") {
    return { ok: false, error: "This call is no longer ringing.", status: 409 };
  }
  return { ok: true, call: finish(found.call, "declined") };
}

/** Hang up. Works in any state: a caller hanging up while ringing cancels the call. */
export function endCall(callId: string, by: Participant, reason?: "failed"): CallResult {
  const found = findCall(callId, by);
  if (!found.ok) return found;
  const { call } = found;
  if (call.status === "ended") return { ok: true, call };

  const endReason: CallEndReason =
    reason ??
    (call.status === "active" ? "completed" : by.role === "doctor" ? "cancelled" : "declined");
  return { ok: true, call: finish(call, endReason) };
}

/** Forwards a WebRTC offer/answer/ICE candidate to the other participant. */
export function relaySignal(callId: string, from: Participant, data: SignalData): CallResult {
  const found = findCall(callId, from);
  if (!found.ok) return found;
  const { call } = found;
  // Trailing ICE candidates routinely arrive just after a hang-up; there's no one to deliver them to.
  if (call.status === "ended") return { ok: true, call };
  if (call.status !== "active") return { ok: false, error: "Call is not active.", status: 409 };

  const to: Participant =
    from.role === "doctor"
      ? { role: "patient", id: call.patientId }
      : { role: "doctor", id: call.doctorId };
  hub.emitter.emit(channel(to), { type: "signal", callId, data } satisfies RealtimeEvent);
  return { ok: true, call };
}

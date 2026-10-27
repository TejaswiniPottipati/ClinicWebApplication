import type { Role, SignalData } from "@/lib/types";

// Used until the API answers (or if it can't): STUN lets peers on different networks find each
// other's public addresses. The API adds Cloudflare TURN relays for strict NATs and firewalls.
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];

// Testing aid: NEXT_PUBLIC_FORCE_TURN_RELAY=true allows relayed connections only, so a call that
// connects proves TURN works (and one without TURN configured fails).
const ICE_TRANSPORT_POLICY: RTCIceTransportPolicy =
  process.env.NEXT_PUBLIC_FORCE_TURN_RELAY === "true" ? "relay" : "all";

/** How long a dropped connection gets to recover through an ICE restart before the call fails. */
const RESTART_TIMEOUT_MS = 10_000;

/**
 * How long negotiation may take before the call fails. Without it, a network where no candidate
 * works (nothing gathered at all) leaves the connection in "new" forever instead of "failed".
 */
const CONNECT_TIMEOUT_MS = 30_000;

interface CallPeerOptions {
  callId: string;
  role: Role;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onFailed: () => void;
}

/**
 * One WebRTC connection for one call. The doctor (caller) calls `start()` to send an offer once
 * the patient accepts; the patient answers it. Signals travel through our server; audio and
 * video go directly between the browsers, or through a Cloudflare TURN relay when they can't.
 */
export class CallPeer {
  private pc: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  // Incoming signals must be applied in order, and so must outgoing ones be sent.
  private inbox = Promise.resolve();
  private outbox = Promise.resolve();
  // Resolves once the call's ICE servers are in place; nothing gathers candidates before that.
  private iceReady: Promise<void>;
  private wasConnected = false;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private connectTimer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;

  constructor(private opts: CallPeerOptions) {
    this.pc = new RTCPeerConnection({
      iceServers: FALLBACK_ICE_SERVERS,
      iceTransportPolicy: ICE_TRANSPORT_POLICY,
    });
    for (const track of opts.localStream.getTracks()) this.pc.addTrack(track, opts.localStream);
    this.iceReady = this.loadIceServers();

    this.pc.ontrack = (e) => opts.onRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ type: "candidate", candidate: e.candidate.toJSON() });
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === "connected") {
        this.wasConnected = true;
        clearTimeout(this.connectTimer);
        clearTimeout(this.restartTimer);
        this.restartTimer = undefined;
      } else if (state === "failed") {
        this.recover();
      }
    };
  }

  async start() {
    await this.iceReady;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ type: "offer", sdp: offer.sdp ?? "" });
    this.armConnectTimeout();
  }

  handleSignal(data: SignalData) {
    this.inbox = this.inbox.then(() => this.apply(data)).catch(() => this.fail());
  }

  close() {
    this.closed = true;
    clearTimeout(this.connectTimer);
    clearTimeout(this.restartTimer);
    this.pc.close();
  }

  /** Swaps in the call's STUN/TURN servers from the API. Keeps the fallback if that fails. */
  private async loadIceServers() {
    try {
      const { callId, role } = this.opts;
      const res = await fetch(`/api/calls/${callId}/ice-servers?role=${role}`);
      if (!res.ok) return;
      const { iceServers } = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (iceServers?.length && !this.closed) {
        this.pc.setConfiguration({ iceServers, iceTransportPolicy: ICE_TRANSPORT_POLICY });
      }
    } catch {
      // Network error: a direct connection may still work with the fallback STUN server.
    }
  }

  /**
   * A connection that worked and then failed (network switch, relay maintenance) gets one ICE
   * restart; one that never connected won't do better on a retry, so the call fails.
   */
  private recover() {
    if (this.closed || this.restartTimer) return;
    if (!this.wasConnected) return this.fail();

    this.restartTimer = setTimeout(() => {
      this.restartTimer = undefined;
      if (this.pc.connectionState !== "connected") this.fail();
    }, RESTART_TIMEOUT_MS);
    // The doctor made the original offer, so the doctor makes the new one; the patient waits for it.
    if (this.opts.role === "doctor") {
      this.inbox = this.inbox.then(() => this.restartIce()).catch(() => this.fail());
    }
  }

  private async restartIce() {
    if (this.closed) return;
    const offer = await this.pc.createOffer({ iceRestart: true });
    await this.pc.setLocalDescription(offer);
    this.send({ type: "offer", sdp: offer.sdp ?? "" });
  }

  /** Starts the connect deadline once, when negotiation begins (offer sent or answered). */
  private armConnectTimeout() {
    if (this.connectTimer || this.wasConnected) return;
    this.connectTimer = setTimeout(() => {
      if (!this.wasConnected) this.fail();
    }, CONNECT_TIMEOUT_MS);
  }

  private fail() {
    if (!this.closed) this.opts.onFailed();
  }

  private async apply(data: SignalData) {
    await this.iceReady;
    if (this.closed) return;
    if (data.type === "candidate") {
      // Candidates can arrive before the offer/answer they belong to; hold them until then.
      if (this.pc.remoteDescription) await this.pc.addIceCandidate(data.candidate);
      else this.pendingCandidates.push(data.candidate);
      return;
    }

    await this.pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
    if (data.type === "offer") {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.send({ type: "answer", sdp: answer.sdp ?? "" });
      this.armConnectTimeout();
    }
    for (const candidate of this.pendingCandidates.splice(0)) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  private send(data: SignalData) {
    const { callId, role } = this.opts;
    this.outbox = this.outbox
      .then(async () => {
        if (this.closed) return;
        await fetch(`/api/calls/${callId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, data }),
        });
      })
      .catch(() => {});
  }
}

/** Microphone (and camera for video calls). Falls back to audio only if there's no usable camera. */
export async function getCallMedia(kind: "audio" | "video") {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Calls need a secure connection (https or localhost).");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
  } catch (err) {
    if (kind === "video") {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {}
    }
    throw new Error(mediaErrorMessage(err));
  }
}

function mediaErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") {
    return "Microphone access is blocked. Allow it in your browser's site settings to use calls.";
  }
  if (name === "NotFoundError") return "No microphone was found on this device.";
  if (name === "NotReadableError") return "Your microphone is being used by another app.";
  return "Couldn't access your microphone.";
}

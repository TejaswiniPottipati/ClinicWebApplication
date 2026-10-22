import type { Role, SignalData } from "@/lib/types";

// Public STUN lets peers on different networks discover their addresses. Calls across
// strict NATs would also need a TURN server, which isn't set up for this demo.
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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
 * video go directly between the browsers.
 */
export class CallPeer {
  private pc: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  // Incoming signals must be applied in order, and so must outgoing ones be sent.
  private inbox = Promise.resolve();
  private outbox = Promise.resolve();
  private closed = false;

  constructor(private opts: CallPeerOptions) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    for (const track of opts.localStream.getTracks()) this.pc.addTrack(track, opts.localStream);

    this.pc.ontrack = (e) => opts.onRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ type: "candidate", candidate: e.candidate.toJSON() });
    };
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === "failed") opts.onFailed();
    };
  }

  async start() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ type: "offer", sdp: offer.sdp ?? "" });
  }

  handleSignal(data: SignalData) {
    this.inbox = this.inbox.then(() => this.apply(data)).catch(() => {
      if (!this.closed) this.opts.onFailed();
    });
  }

  close() {
    this.closed = true;
    this.pc.close();
  }

  private async apply(data: SignalData) {
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

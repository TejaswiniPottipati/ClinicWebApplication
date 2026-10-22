"use client";

import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { useRealtime, useRealtimeEvent } from "@/components/realtime/realtime-provider";
import type { Call, CallEndReason, CallKind } from "@/lib/types";
import { CallSurface, ErrorToast } from "./call-ui";
import { CallPeer, getCallMedia } from "./peer";
import { playRingtone } from "./ringtone";

interface CallContextValue {
  /** The call in progress (ringing or active), if any. */
  call: Call | null;
  /** True while a call is in progress or being set up. */
  busy: boolean;
  /** Doctor only: ring a patient. */
  startCall: (patientId: string, kind: CallKind) => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

const ENDED_NOTICE_MS = 3500;

/**
 * Owns the call lifecycle for this tab: listens for call events, gets the microphone/camera,
 * runs the WebRTC connection and renders the call UI on top of the page.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { role } = useRealtime();

  // `call` is the server's view of the call (plus optimistic local endings).
  const [call, setCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callRef = useRef<Call | null>(null);
  const peerRef = useRef<CallPeer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The call this tab is taking part in (has media for). Other live calls are leftovers.
  const ownedRef = useRef<string | null>(null);
  const placingRef = useRef(false);
  const negotiatedRef = useRef(false);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const live = call && call.status !== "ended" ? call : null;

  function postAction(callId: string, action: "accept" | "decline" | "end", failed?: boolean) {
    return fetch(`/api/calls/${callId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, action, failed }),
    });
  }

  function teardown() {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ownedRef.current = null;
    negotiatedRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteHasVideo(false);
    setMicOn(true);
    setCamOn(false);
    setPending(false);
  }

  /** Show the "call ended" notice briefly, then clear it (unless a new call has started). */
  function showEnded(ended: Call) {
    setCall(ended);
    setTimeout(() => {
      setCall((c) => (c?.id === ended.id && c.status === "ended" ? null : c));
    }, ENDED_NOTICE_MS);
  }

  function endLocally(callId: string, endReason: CallEndReason) {
    teardown();
    const c = callRef.current;
    if (c?.id === callId) showEnded({ ...c, status: "ended", endReason, endedAt: new Date().toISOString() });
  }

  function hangUp(callId: string, failed = false) {
    const c = callRef.current;
    postAction(callId, "end", failed).catch(() => {});
    endLocally(callId, failed ? "failed" : c?.status === "active" ? "completed" : "cancelled");
  }

  function attachMedia(callId: string, stream: MediaStream) {
    ownedRef.current = callId;
    streamRef.current = stream;
    setLocalStream(stream);
    setCamOn(stream.getVideoTracks().length > 0);
    peerRef.current = new CallPeer({
      callId,
      role,
      localStream: stream,
      onRemoteStream: (s) => {
        setRemoteStream(s);
        setRemoteHasVideo(s.getVideoTracks().length > 0);
      },
      onFailed: () => hangUp(callId, true),
    });
  }

  useRealtimeEvent((event) => {
    if (event.type === "signal") {
      if (event.callId === ownedRef.current) peerRef.current?.handleSignal(event.data);
      return;
    }
    if (event.type !== "call") return;

    const c = event.call;
    if (c.status === "ended") {
      if (callRef.current?.id === c.id) {
        teardown();
        showEnded(c);
      }
      return;
    }
    if (live && live.id !== c.id) return;

    const owned = ownedRef.current === c.id || (role === "doctor" && placingRef.current);
    // A live call this tab has no media for, e.g. after reloading mid-call. It can't recover,
    // so end it rather than leave the other person waiting. (Ringing calls are fine for patients.)
    if (!owned && (c.status === "active" || role === "doctor")) {
      postAction(c.id, "end", true).catch(() => {});
      return;
    }

    setCall(c);
    // The patient answered: the doctor's side starts the WebRTC negotiation.
    if (c.status === "active" && role === "doctor" && peerRef.current && !negotiatedRef.current) {
      negotiatedRef.current = true;
      peerRef.current.start().catch(() => hangUp(c.id, true));
    }
  });

  async function startCall(patientId: string, kind: CallKind) {
    if (live || pending) return;
    setError(null);
    setPending(true);
    try {
      const stream = await getCallMedia(kind);
      placingRef.current = true;
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, kind }),
      });
      const body = (await res.json().catch(() => ({}))) as { call?: Call; error?: string };
      if (!res.ok || !body.call) {
        stream.getTracks().forEach((t) => t.stop());
        setError(body.error ?? "Couldn't start the call.");
        return;
      }
      const placed = body.call;
      attachMedia(placed.id, stream);
      setCall((c) => (c?.id === placed.id ? c : placed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the call.");
    } finally {
      placingRef.current = false;
      setPending(false);
    }
  }

  async function accept() {
    const c = live;
    if (!c || c.status !== "ringing" || pending) return;
    setError(null);
    setPending(true);

    let stream: MediaStream;
    try {
      stream = await getCallMedia(c.kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't access your microphone.");
      setPending(false);
      return;
    }
    // The caller may have hung up while the browser was asking for permission.
    if (callRef.current?.id !== c.id || callRef.current.status !== "ringing") {
      stream.getTracks().forEach((t) => t.stop());
      setPending(false);
      return;
    }

    // Set up the connection before accepting, so the doctor's offer always has somewhere to land.
    attachMedia(c.id, stream);
    const res = await postAction(c.id, "accept").catch(() => null);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      teardown();
      setError(body?.error ?? "Couldn't answer the call.");
    }
    setPending(false);
  }

  function decline() {
    if (!live) return;
    postAction(live.id, "decline").catch(() => {});
    endLocally(live.id, "declined");
  }

  function toggleMic() {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function toggleCam() {
    const next = !camOn;
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }

  // Ring while a call is coming in.
  const incoming = role === "patient" && call?.status === "ringing";
  useEffect(() => (incoming ? playRingtone() : undefined), [incoming]);

  // Closing the tab or signing out hangs up instead of leaving the other person on a dead call.
  useEffect(() => {
    const hangUpOnExit = () => {
      const id = ownedRef.current;
      if (id) navigator.sendBeacon(`/api/calls/${id}`, JSON.stringify({ role, action: "end" }));
    };
    const peer = peerRef;
    const stream = streamRef;
    window.addEventListener("pagehide", hangUpOnExit);
    return () => {
      window.removeEventListener("pagehide", hangUpOnExit);
      hangUpOnExit();
      peer.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [role]);

  return (
    <CallContext value={{ call: live, busy: !!live || pending, startCall }}>
      {children}
      {call && (
        <CallSurface
          call={call}
          role={role}
          pending={pending}
          localStream={localStream}
          remoteStream={remoteStream}
          remoteHasVideo={remoteHasVideo}
          micOn={micOn}
          camOn={camOn}
          hasLocalVideo={!!localStream?.getVideoTracks().length}
          onAccept={accept}
          onDecline={decline}
          onHangUp={() => hangUp(call.id)}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
        />
      )}
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
    </CallContext>
  );
}

export function useCalls() {
  const ctx = use(CallContext);
  if (!ctx) throw new Error("useCalls must be used within a CallProvider");
  return ctx;
}

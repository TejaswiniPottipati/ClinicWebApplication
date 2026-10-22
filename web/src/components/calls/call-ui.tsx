"use client";

import { useEffect, useRef, useState } from "react";
import {
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "@/components/icons";
import { formatDuration, initials } from "@/lib/format";
import type { Call, Role } from "@/lib/types";

interface CallSurfaceProps {
  call: Call;
  role: Role;
  pending: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteHasVideo: boolean;
  micOn: boolean;
  camOn: boolean;
  hasLocalVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
}

/** Picks the right view for the call's state and which side of it we're on. */
export function CallSurface(props: CallSurfaceProps) {
  const { call, role } = props;
  const other = role === "doctor" ? call.patientName : call.doctorName;

  if (call.status === "ended") return <CallEnded call={call} role={role} other={other} />;
  if (call.status === "active") return <ActiveCall {...props} other={other} />;
  return role === "patient" ? (
    <IncomingCall {...props} other={other} />
  ) : (
    <OutgoingCall {...props} other={other} />
  );
}

function kindLabel(call: Call) {
  return call.kind === "video" ? "video call" : "audio call";
}

function Avatar({ name, size = "lg" }: { name: string; size?: "lg" | "xl" }) {
  const cls = size === "xl" ? "h-28 w-28 text-4xl" : "h-20 w-20 text-2xl";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-teal-600 font-semibold text-white ${cls}`}
    >
      {initials(name)}
    </span>
  );
}

function RoundButton({
  label,
  onClick,
  tone = "neutral",
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "off" | "danger" | "accept";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-white/15 text-white hover:bg-white/25",
    off: "bg-white text-slate-900 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    accept: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

// ---- Ringing --------------------------------------------------------------------

function IncomingCall({ call, other, pending, onAccept, onDecline }: CallSurfaceProps & { other: string }) {
  const Icon = call.kind === "video" ? VideoIcon : PhoneIcon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-labelledby="incoming-title"
        aria-describedby="incoming-desc"
        className="w-full max-w-sm rounded-3xl bg-slate-900 p-8 text-center text-white shadow-2xl"
      >
        <div className="relative mx-auto mb-5 w-fit">
          <span className="absolute inset-0 animate-ping rounded-full bg-teal-500/40" aria-hidden />
          <Avatar name={other} />
        </div>
        <h2 id="incoming-title" className="text-xl font-semibold">
          {other}
        </h2>
        <p id="incoming-desc" className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-300">
          <Icon width={16} height={16} /> Incoming {kindLabel(call)}…
        </p>
        <div className="mt-8 flex justify-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <RoundButton label="Decline" tone="danger" onClick={onDecline} disabled={pending}>
              <PhoneOffIcon />
            </RoundButton>
            <span className="text-xs text-slate-300">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <RoundButton label="Accept" tone="accept" onClick={onAccept} disabled={pending}>
              <Icon />
            </RoundButton>
            <span className="text-xs text-slate-300">{pending ? "Connecting…" : "Accept"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutgoingCall({ call, other, localStream, hasLocalVideo, onHangUp }: CallSurfaceProps & { other: string }) {
  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 w-72 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl"
    >
      {hasLocalVideo && localStream && (
        <MediaView stream={localStream} mirror className="aspect-video w-full bg-black object-cover" />
      )}
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">Calling {other}…</p>
          <p className="text-xs text-slate-400">Ringing · {kindLabel(call)}</p>
        </div>
        <RoundButton label="Cancel call" tone="danger" onClick={onHangUp}>
          <PhoneOffIcon />
        </RoundButton>
      </div>
    </div>
  );
}

// ---- In call ----------------------------------------------------------------------

function ActiveCall({
  call,
  other,
  localStream,
  remoteStream,
  remoteHasVideo,
  micOn,
  camOn,
  hasLocalVideo,
  onHangUp,
  onToggleMic,
  onToggleCam,
}: CallSurfaceProps & { other: string }) {
  const showRemoteVideo = call.kind === "video" && remoteHasVideo && remoteStream;
  return (
    <div
      role="dialog"
      aria-label={`${call.kind === "video" ? "Video" : "Audio"} call with ${other}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white"
    >
      {remoteStream && <RemoteAudio stream={remoteStream} />}

      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-medium">{other}</p>
          <p className="text-sm text-slate-400" aria-live="polite">
            {remoteStream && call.answeredAt ? <Elapsed since={call.answeredAt} /> : "Connecting…"}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
          {call.kind === "video" ? "Video call" : "Audio call"}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {showRemoteVideo ? (
          <MediaView
            stream={remoteStream}
            className="h-full max-h-full w-full max-w-5xl rounded-2xl bg-black object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar name={other} size="xl" />
            {call.kind === "video" && remoteStream && (
              <p className="text-sm text-slate-400">{other.split(" ")[0]}&apos;s camera is off</p>
            )}
          </div>
        )}

        {hasLocalVideo && localStream && (
          <div className="absolute right-6 bottom-4 w-32 overflow-hidden rounded-xl bg-slate-800 shadow-lg ring-1 ring-white/10 sm:w-48">
            {camOn ? (
              <MediaView stream={localStream} mirror className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-xs text-slate-400">
                Camera off
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-6">
        <RoundButton
          label={micOn ? "Mute microphone" : "Unmute microphone"}
          tone={micOn ? "neutral" : "off"}
          onClick={onToggleMic}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </RoundButton>
        {hasLocalVideo && (
          <RoundButton
            label={camOn ? "Turn camera off" : "Turn camera on"}
            tone={camOn ? "neutral" : "off"}
            onClick={onToggleCam}
          >
            {camOn ? <VideoIcon /> : <VideoOffIcon />}
          </RoundButton>
        )}
        <RoundButton label="End call" tone="danger" onClick={onHangUp}>
          <PhoneOffIcon />
        </RoundButton>
      </div>
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatDuration(now - Date.parse(since))}</>;
}

function MediaView({ stream, mirror, className }: { stream: MediaStream; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  // Always muted: remote audio plays through <RemoteAudio>, and our own would echo.
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`${mirror ? "-scale-x-100" : ""} ${className ?? ""}`}
    />
  );
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

// ---- After the call ---------------------------------------------------------------

function endedText(call: Call, role: Role, other: string) {
  switch (call.endReason) {
    case "completed": {
      const duration =
        call.answeredAt && call.endedAt
          ? ` · ${formatDuration(Date.parse(call.endedAt) - Date.parse(call.answeredAt))}`
          : "";
      return `Call ended${duration}`;
    }
    case "declined":
      return role === "doctor" ? `${other} declined the call` : "Call declined";
    case "missed":
      return role === "doctor" ? "No answer" : `Missed call from ${other}`;
    case "cancelled":
      return role === "doctor" ? "Call cancelled" : `Missed call from ${other}`;
    default:
      return "Call disconnected";
  }
}

function CallEnded({ call, role, other }: { call: Call; role: Role; other: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl"
    >
      <span className="inline-flex items-center gap-2">
        <PhoneOffIcon width={16} height={16} />
        {endedText(call, role, other)}
      </span>
    </div>
  );
}

export function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="fixed right-4 bottom-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-rose-200"
    >
      <p className="flex-1 text-rose-700">{message}</p>
      <button type="button" onClick={onDismiss} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

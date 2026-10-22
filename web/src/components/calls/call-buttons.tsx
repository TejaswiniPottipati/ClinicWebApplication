"use client";

import { PhoneIcon, VideoIcon } from "@/components/icons";
import { useCalls } from "./call-provider";

/** Doctor-side buttons to ring a patient. */
export function CallButtons({ patientId }: { patientId: string }) {
  const { busy, startCall } = useCalls();
  const button =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal-600 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex gap-2">
      <a href="#messages" className={button}>
        Message
      </a>
      <button type="button" className={button} disabled={busy} onClick={() => startCall(patientId, "audio")}>
        <PhoneIcon width={16} height={16} /> Audio call
      </button>
      <button type="button" className={button} disabled={busy} onClick={() => startCall(patientId, "video")}>
        <VideoIcon width={16} height={16} /> Video call
      </button>
    </div>
  );
}

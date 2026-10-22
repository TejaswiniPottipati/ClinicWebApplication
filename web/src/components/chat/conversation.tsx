"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PhoneIcon, SendIcon, VideoIcon } from "@/components/icons";
import { useRealtime, useRealtimeEvent } from "@/components/realtime/realtime-provider";
import { formatDuration, formatMessageTime } from "@/lib/format";
import type { Message, Role } from "@/lib/types";

interface ConversationProps {
  patientId: string;
  /** Name of the other person, for the empty state and input placeholder. */
  counterpartName: string;
  initialMessages: Message[];
  className?: string;
}

function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export function Conversation({ patientId, counterpartName, initialMessages, className = "" }: ConversationProps) {
  const { role } = useRealtime();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useRealtimeEvent(async (event) => {
    if (event.type === "message" && event.message.patientId === patientId) {
      setMessages((prev) => mergeMessages(prev, [event.message]));
    } else if (event.type === "reconnected") {
      // Anything sent while we were disconnected never reached us; fetch the history again.
      const res = await fetch(`/api/messages?role=${role}&patientId=${encodeURIComponent(patientId)}`);
      if (res.ok) {
        const { messages: latest } = (await res.json()) as { messages: Message[] };
        setMessages((prev) => mergeMessages(prev, latest));
      }
    }
  });

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, patientId, body }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { message } = (await res.json()) as { message: Message };
      setMessages((prev) => mergeMessages(prev, [message]));
      setDraft("");
    } catch {
      setError("Message not sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${counterpartName}`}
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            No messages yet. Say hello to {counterpartName}.
          </p>
        )}
        {messages.map((m) =>
          m.call ? (
            <CallLogEntry key={m.id} message={m} viewer={role} />
          ) : (
            <Bubble key={m.id} message={m} mine={m.sender === role} />
          ),
        )}
      </div>

      <form onSubmit={send} className="border-t border-slate-200 p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-rose-600">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor={`compose-${patientId}`} className="sr-only">
            Message {counterpartName}
          </label>
          <textarea
            id={`compose-${patientId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
            }}
            rows={1}
            maxLength={2000}
            placeholder={`Message ${counterpartName}…`}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none field-sizing-content placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
          >
            <SendIcon width={18} height={18} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line</p>
      </form>
    </div>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        <p
          className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
            mine
              ? "rounded-br-md bg-teal-600 text-white"
              : "rounded-bl-md bg-slate-100 text-slate-900"
          }`}
        >
          {message.body}
        </p>
        <time
          dateTime={message.sentAt}
          suppressHydrationWarning
          className={`mt-1 block text-[11px] text-slate-400 ${mine ? "text-right" : ""}`}
        >
          {formatMessageTime(message.sentAt)}
        </time>
      </div>
    </div>
  );
}

function CallLogEntry({ message, viewer }: { message: Message; viewer: Role }) {
  const call = message.call!;
  const Icon = call.kind === "video" ? VideoIcon : PhoneIcon;
  const answered = call.answeredAt && call.endedAt;
  // A call the doctor gave up on before it was answered is, for the patient, a missed call.
  const missedByViewer = viewer === "patient" && call.endReason === "cancelled";
  const unanswered = call.endReason === "missed" || call.endReason === "declined" || missedByViewer;
  const label = missedByViewer ? `Missed ${call.kind} call` : message.body;
  return (
    <div className="flex justify-center">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ring-inset ${
          unanswered ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-600 ring-slate-200"
        }`}
      >
        <Icon width={14} height={14} />
        <span>
          {label}
          {answered &&
            ` · ${formatDuration(new Date(call.endedAt!).getTime() - new Date(call.answeredAt!).getTime())}`}
        </span>
        <time dateTime={message.sentAt} suppressHydrationWarning className="text-slate-400">
          {formatMessageTime(message.sentAt)}
        </time>
      </div>
    </div>
  );
}

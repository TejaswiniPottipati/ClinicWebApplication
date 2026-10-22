"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeEvent, Role } from "@/lib/types";

/** Server events, plus a client-side notice that the stream reconnected and events may have been missed. */
export type ClientEvent = RealtimeEvent | { type: "reconnected" };

type Listener = (event: ClientEvent) => void;

interface RealtimeContextValue {
  role: Role;
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ role, children }: { role: Role; children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const emit = (event: ClientEvent) => listeners.current.forEach((l) => l(event));
    let hasConnected = false;

    // EventSource reconnects on its own after network errors or server restarts.
    const source = new EventSource(`/api/realtime?role=${role}`);
    source.onopen = () => {
      setConnected(true);
      if (hasConnected) emit({ type: "reconnected" });
      hasConnected = true;
    };
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => emit(JSON.parse(e.data) as RealtimeEvent);
    return () => source.close();
  }, [role]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return <RealtimeContext value={{ role, connected, subscribe }}>{children}</RealtimeContext>;
}

export function useRealtime() {
  const ctx = use(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within a RealtimeProvider");
  return ctx;
}

/** Calls `handler` for every realtime event. The handler always sees the latest props and state. */
export function useRealtimeEvent(handler: Listener) {
  const { subscribe } = useRealtime();
  const onEvent = useEffectEvent(handler);
  useEffect(() => subscribe((e) => onEvent(e)), [subscribe]);
}

export function ConnectionStatus() {
  const { connected } = useRealtime();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" role="status">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "animate-pulse bg-amber-400"}`}
        aria-hidden
      />
      {connected ? "Live" : "Connecting…"}
    </span>
  );
}

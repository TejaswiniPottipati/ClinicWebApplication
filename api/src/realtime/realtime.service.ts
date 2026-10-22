import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Observable } from 'rxjs';
import type { Participant, RealtimeEvent } from '../common/types.js';

// How long a user may be fully disconnected (e.g. a page reload) before they count as gone.
export const DISCONNECT_GRACE_MS = 5_000;

type ConnectHook = (p: Participant) => Promise<RealtimeEvent[]>;
type DisconnectHook = (p: Participant) => Promise<void>;

const channel = (p: Participant) => `${p.role}:${p.id}`;

/**
 * Per-user event bus behind the SSE endpoint. In-process only: running several API instances
 * would need a shared broker (e.g. Redis pub/sub) in its place.
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly emitter = new EventEmitter().setMaxListeners(0);
  private readonly connectHooks: ConnectHook[] = [];
  private readonly disconnectHooks: DisconnectHook[] = [];
  private readonly graceTimers = new Set<ReturnType<typeof setTimeout>>();

  publish(to: Participant[], event: RealtimeEvent) {
    for (const p of to) this.emitter.emit(channel(p), event);
  }

  /** Events to replay to a user when they connect, e.g. a call that is already ringing. */
  onConnect(hook: ConnectHook) {
    this.connectHooks.push(hook);
  }

  /** Runs when a user has had no open stream for DISCONNECT_GRACE_MS. */
  onDisconnect(hook: DisconnectHook) {
    this.disconnectHooks.push(hook);
  }

  stream(p: Participant): Observable<RealtimeEvent> {
    return new Observable<RealtimeEvent>((subscriber) => {
      const ch = channel(p);
      const listener = (event: RealtimeEvent) => subscriber.next(event);
      this.emitter.on(ch, listener);

      void Promise.all(this.connectHooks.map((hook) => hook(p))).then(
        (batches) => batches.flat().forEach((event) => subscriber.next(event)),
        (err: unknown) => subscriber.error(err),
      );

      return () => {
        this.emitter.off(ch, listener);
        const timer = setTimeout(() => {
          this.graceTimers.delete(timer);
          if (this.emitter.listenerCount(ch) > 0) return;
          for (const hook of this.disconnectHooks) void hook(p).catch(() => {});
        }, DISCONNECT_GRACE_MS);
        timer.unref();
        this.graceTimers.add(timer);
      };
    });
  }

  onModuleDestroy() {
    this.graceTimers.forEach(clearTimeout);
  }
}

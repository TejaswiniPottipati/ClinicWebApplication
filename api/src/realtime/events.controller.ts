import { Controller, Sse, type MessageEvent } from '@nestjs/common';
import { interval, map, merge, startWith, type Observable } from 'rxjs';
import { CurrentUser, type AuthUser } from '../common/auth.decorators.js';
import { RealtimeService } from './realtime.service.js';

const HEARTBEAT_MS = 20_000;

@Controller()
export class EventsController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Server-Sent Events stream of messages, call updates and WebRTC signals for the caller.
   * Unnamed events carry a RealtimeEvent as JSON; named `ping` events keep idle connections open.
   */
  @Sse('events')
  events(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      startWith(0), // sends something straight away so clients see the stream open
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );
    const events = this.realtime
      .stream({ role: user.role, id: user.id })
      .pipe(map((event): MessageEvent => ({ data: event })));
    return merge(heartbeat, events);
  }
}

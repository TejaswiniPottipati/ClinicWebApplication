import type { NextRequest } from "next/server";
import { subscribe } from "@/lib/realtime/hub";
import { actorFor, jsonError, parseRole } from "@/lib/realtime/auth";
import type { RealtimeEvent } from "@/lib/types";

const HEARTBEAT_MS = 20_000;

/** Server-Sent Events stream of messages, call updates and WebRTC signals for one user. */
export async function GET(req: NextRequest) {
  const actor = await actorFor(parseRole(req.nextUrl.searchParams.get("role")));
  if (!actor) return jsonError("Unauthorized", 401);

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };
      const unsubscribe = subscribe(actor.participant, (event: RealtimeEvent) =>
        write(`data: ${JSON.stringify(event)}\n\n`),
      );
      // Comments keep proxies from closing an idle connection.
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      let closed = false;
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      write(": connected\n\n");
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

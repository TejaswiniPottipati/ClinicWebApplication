import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { actorFor, errorResponse, jsonError, parseRole } from "@/lib/bff";

/**
 * The caller's Server-Sent Events stream, piped through from the clinic API. Closing the
 * browser connection aborts the upstream request, so the API sees the disconnect.
 */
export async function GET(req: NextRequest) {
  const actor = await actorFor(parseRole(req.nextUrl.searchParams.get("role")));
  if (!actor) return jsonError("Unauthorized", 401);

  try {
    const upstream = await api.openEvents(actor.ctx, req.signal);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

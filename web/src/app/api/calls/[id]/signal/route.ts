import { api } from "@/lib/api";
import { actorFor, errorResponse, jsonError, parseRole } from "@/lib/bff";
import type { SignalData } from "@/lib/types";

/** Relays WebRTC negotiation to the other participant via the API. Media itself flows peer to peer. */
export async function POST(req: Request, { params }: RouteContext<"/api/calls/[id]/signal">) {
  const { id } = await params;
  const input = (await req.json().catch(() => null)) as { role?: unknown; data?: unknown } | null;

  const actor = await actorFor(parseRole(input?.role));
  if (!actor) return jsonError("Unauthorized", 401);
  if (!input?.data || typeof input.data !== "object") return jsonError("Invalid signal.", 400);

  try {
    // The API validates the payload's shape.
    await api.signal(actor.ctx, id, input.data as SignalData);
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}

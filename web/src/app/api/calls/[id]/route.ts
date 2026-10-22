import { api, type CallAction } from "@/lib/api";
import { actorFor, errorResponse, jsonError, parseRole } from "@/lib/bff";

const ACTIONS: CallAction[] = ["accept", "decline", "end"];

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Accept, decline or end a call. */
export async function POST(req: Request, { params }: RouteContext<"/api/calls/[id]">) {
  const { id } = await params;
  // sendBeacon (used on page unload) posts plain text, so parse the body ourselves.
  const input = parseJson(await req.text()) as { role?: unknown; action?: unknown; failed?: unknown } | null;

  const actor = await actorFor(parseRole(input?.role));
  if (!actor) return jsonError("Unauthorized", 401);

  const action = ACTIONS.find((a) => a === input?.action);
  if (!action) return jsonError("Invalid request.", 400);

  try {
    return Response.json({ call: await api.updateCall(actor.ctx, id, action, input?.failed === true) });
  } catch (err) {
    return errorResponse(err);
  }
}

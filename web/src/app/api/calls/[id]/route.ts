import * as z from "zod";
import { acceptCall, declineCall, endCall } from "@/lib/realtime/hub";
import { actorFor, jsonError, parseRole } from "@/lib/realtime/auth";

const Body = z.object({
  role: z.enum(["doctor", "patient"]),
  action: z.enum(["accept", "decline", "end"]),
  // Set when the client hangs up because media or the connection failed.
  failed: z.boolean().optional(),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request, { params }: RouteContext<"/api/calls/[id]">) {
  const { id } = await params;
  // sendBeacon (used on page unload) posts plain text, so parse the body ourselves.
  const parsed = Body.safeParse(parseJson(await req.text()));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const actor = await actorFor(parseRole(parsed.data.role));
  if (!actor) return jsonError("Unauthorized", 401);

  const { action, failed } = parsed.data;
  const result =
    action === "accept" ? acceptCall(id, actor.participant)
    : action === "decline" ? declineCall(id, actor.participant)
    : endCall(id, actor.participant, failed ? "failed" : undefined);

  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ call: result.call });
}

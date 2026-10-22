import * as z from "zod";
import { startCall } from "@/lib/realtime/hub";
import { actorFor, conversationFor, jsonError } from "@/lib/realtime/auth";

const Body = z.object({
  patientId: z.string(),
  kind: z.enum(["audio", "video"]),
});

/** A doctor rings one of their patients. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const actor = await actorFor("doctor");
  if (!actor) return jsonError("Unauthorized", 401);

  const conversation = await conversationFor(actor, parsed.data.patientId);
  if (!conversation) return jsonError("Patient not found.", 404);

  const result = startCall(conversation, parsed.data.kind);
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ call: result.call }, { status: 201 });
}

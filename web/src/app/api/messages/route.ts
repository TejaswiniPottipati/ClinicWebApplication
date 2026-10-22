import type { NextRequest } from "next/server";
import * as z from "zod";
import { listMessages, sendMessage } from "@/lib/realtime/hub";
import { actorFor, conversationFor, jsonError, parseRole } from "@/lib/realtime/auth";

/** Full history of one conversation. Used to catch up after the realtime stream reconnects. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const actor = await actorFor(parseRole(params.get("role")));
  if (!actor) return jsonError("Unauthorized", 401);

  const conversation = await conversationFor(actor, params.get("patientId") ?? undefined);
  if (!conversation) return jsonError("Conversation not found.", 404);

  return Response.json({ messages: listMessages(conversation) });
}

const Body = z.object({
  role: z.enum(["doctor", "patient"]),
  patientId: z.string().optional(),
  body: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid message.", 400);

  const actor = await actorFor(parseRole(parsed.data.role));
  if (!actor) return jsonError("Unauthorized", 401);

  const conversation = await conversationFor(actor, parsed.data.patientId);
  if (!conversation) return jsonError("Conversation not found.", 404);

  const message = sendMessage(conversation, actor.participant.role, parsed.data.body);
  return Response.json({ message }, { status: 201 });
}

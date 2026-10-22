import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { actorFor, errorResponse, jsonError, parseRole } from "@/lib/bff";

// Patients always use their own conversation; doctors name the patient.
function conversationId(actor: NonNullable<Awaited<ReturnType<typeof actorFor>>>, patientId: unknown) {
  if (actor.session.role === "patient") return actor.session.userId;
  return typeof patientId === "string" && patientId ? patientId : null;
}

/** Full history of one conversation. Used to catch up after the realtime stream reconnects. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const actor = await actorFor(parseRole(params.get("role")));
  if (!actor) return jsonError("Unauthorized", 401);

  const patientId = conversationId(actor, params.get("patientId"));
  if (!patientId) return jsonError("patientId is required.", 400);

  try {
    return Response.json({ messages: await api.listMessages(actor.ctx, patientId) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  const input = (await req.json().catch(() => null)) as {
    role?: unknown;
    patientId?: unknown;
    body?: unknown;
  } | null;
  const actor = await actorFor(parseRole(input?.role));
  if (!actor) return jsonError("Unauthorized", 401);

  const patientId = conversationId(actor, input?.patientId);
  if (!patientId || typeof input?.body !== "string") return jsonError("Invalid message.", 400);

  try {
    return Response.json({ message: await api.sendMessage(actor.ctx, patientId, input.body) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

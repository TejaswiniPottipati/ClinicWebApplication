import { api } from "@/lib/api";
import { actorFor, errorResponse, jsonError } from "@/lib/bff";
import type { CallKind } from "@/lib/types";

/** A doctor rings one of their patients. */
export async function POST(req: Request) {
  const input = (await req.json().catch(() => null)) as { patientId?: unknown; kind?: unknown } | null;
  const actor = await actorFor("doctor");
  if (!actor) return jsonError("Unauthorized", 401);
  if (typeof input?.patientId !== "string") return jsonError("Invalid request.", 400);

  try {
    const call = await api.startCall(actor.ctx, input.patientId, input.kind as CallKind);
    return Response.json({ call }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

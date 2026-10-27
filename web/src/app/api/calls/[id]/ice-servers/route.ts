import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { actorFor, errorResponse, jsonError, parseRole } from "@/lib/bff";

/** STUN/TURN servers for one call. TURN credentials are short-lived and issued per call by the API. */
export async function GET(req: NextRequest, { params }: RouteContext<"/api/calls/[id]/ice-servers">) {
  const { id } = await params;
  const actor = await actorFor(parseRole(req.nextUrl.searchParams.get("role")));
  if (!actor) return jsonError("Unauthorized", 401);

  try {
    return Response.json({ iceServers: await api.getIceServers(actor.ctx, id) });
  } catch (err) {
    return errorResponse(err);
  }
}

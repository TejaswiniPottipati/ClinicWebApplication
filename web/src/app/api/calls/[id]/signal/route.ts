import * as z from "zod";
import { relaySignal } from "@/lib/realtime/hub";
import { actorFor, jsonError, parseRole } from "@/lib/realtime/auth";
import type { SignalData } from "@/lib/types";

const Body = z.object({
  role: z.enum(["doctor", "patient"]),
  data: z.union([
    z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().max(100_000) }),
    z.object({
      type: z.literal("candidate"),
      candidate: z.object({
        candidate: z.string(),
        sdpMid: z.string().nullish(),
        sdpMLineIndex: z.number().nullish(),
        usernameFragment: z.string().nullish(),
      }),
    }),
  ]),
});

/** Relays WebRTC negotiation between the two browsers. Media itself flows peer to peer. */
export async function POST(req: Request, { params }: RouteContext<"/api/calls/[id]/signal">) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid signal.", 400);

  const actor = await actorFor(parseRole(parsed.data.role));
  if (!actor) return jsonError("Unauthorized", 401);

  const result = relaySignal(id, actor.participant, parsed.data.data as SignalData);
  if (!result.ok) return jsonError(result.error, result.status);
  return new Response(null, { status: 204 });
}

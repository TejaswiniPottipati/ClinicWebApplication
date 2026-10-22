import "server-only";
import { ApiError, type ApiContext } from "@/lib/api";
import { getSession, type SessionPayload } from "@/lib/session";
import type { Role } from "@/lib/types";

// Helpers for the route handlers under app/api, which forward browser requests to the clinic
// API using the caller's access token (backend-for-frontend). The API does the authorization.

export function parseRole(value: unknown): Role | null {
  return value === "doctor" || value === "patient" ? value : null;
}

/**
 * The signed-in user for the given role. A browser may hold both a doctor and a patient
 * session, so every request says which role it is acting as.
 */
export async function actorFor(
  role: Role | null,
): Promise<{ session: SessionPayload; ctx: ApiContext } | null> {
  if (!role) return null;
  const session = await getSession(role);
  if (!session) return null;
  return { session, ctx: { accessToken: session.accessToken } };
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

/** Passes API errors through to the browser with their status; hides anything unexpected. */
export function errorResponse(err: unknown) {
  if (err instanceof ApiError) return jsonError(err.message, err.status);
  console.error(err);
  return jsonError("Something went wrong.", 500);
}

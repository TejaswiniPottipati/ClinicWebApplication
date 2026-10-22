import "server-only";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import type { Conversation, Participant } from "./hub";

// Authorization for the realtime route handlers. A browser may hold both a doctor and a
// patient session, so every request says which role it is acting as.

export function parseRole(value: unknown): Role | null {
  return value === "doctor" || value === "patient" ? value : null;
}

export async function actorFor(role: Role | null) {
  if (!role) return null;
  const session = await getSession(role);
  if (!session) return null;
  return { participant: { role, id: session.userId } satisfies Participant, session };
}

/**
 * The conversation the actor may access: a doctor names one of their own patients,
 * a patient always gets their own doctor.
 */
export async function conversationFor(
  actor: NonNullable<Awaited<ReturnType<typeof actorFor>>>,
  patientId?: string,
): Promise<Conversation | null> {
  const { session } = actor;
  const ctx = { userId: session.userId, accessToken: session.accessToken };

  if (session.role === "doctor") {
    if (!patientId) return null;
    const patient = await api.getPatient(ctx, patientId);
    if (!patient) return null;
    return {
      doctor: { id: session.userId, name: session.name },
      patient: { id: patient.id, name: patient.name },
    };
  }

  const team = await api.getCareTeam(ctx);
  if (!team) return null;
  return { doctor: team.doctor, patient: team.patient };
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { api, ApiError, type ApiContext } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { PatientQuery } from "@/lib/types";

// Data Access Layer: every read of clinic data goes through here so the session is always
// checked first. The API then authorizes each request against the user's access token.

const doctorSession = cache(async () => {
  const session = await getSession("doctor");
  if (!session) redirect("/login");
  return session;
});

const patientSession = cache(async () => {
  const session = await getSession("patient");
  if (!session) redirect("/portal/login");
  return session;
});

const context = (s: { accessToken: string }): ApiContext => ({ accessToken: s.accessToken });

// ---- Doctor ----------------------------------------------------------------------

/** The signed-in doctor's public profile, safe to render. */
export const requireDoctor = cache(async () => {
  const session = await doctorSession();
  return { id: session.userId, name: session.name };
});

export async function getMyPatients(query?: PatientQuery) {
  return api.listPatients(context(await doctorSession()), query);
}

export async function getMyPatient(id: string) {
  const patient = await api.getPatient(context(await doctorSession()), id);
  if (!patient) notFound();
  return patient;
}

/** Message history with one of the doctor's patients. */
export async function getPatientConversation(patientId: string) {
  try {
    return await api.listMessages(context(await doctorSession()), patientId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

// ---- Patient ---------------------------------------------------------------------

export const getMyCareTeam = cache(async () => {
  const team = await api.getCareTeam(context(await patientSession()));
  // A session for a patient that no longer exists: treat as signed out.
  if (!team) redirect("/portal/login");
  return team;
});

/** Message history with the patient's own doctor. */
export async function getMyConversation() {
  const session = await patientSession();
  return api.listMessages(context(session), session.userId);
}

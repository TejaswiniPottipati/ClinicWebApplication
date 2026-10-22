import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types";

// Doctors and patients sign in separately, each with their own cookie, so the
// two portals never share a session (and both can be open in one browser for demos).
export const SESSION_COOKIES: Record<Role, string> = {
  doctor: "cwa_doctor_session",
  patient: "cwa_patient_session",
};
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // one clinic shift

export interface SessionPayload {
  userId: string;
  name: string;
  role: Role;
  accessToken: string;
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.local.");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());
}

/** Verifies a session token, and that it was issued for the expected role. */
export async function decrypt(token: string | undefined, role: Role): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.role === role ? payload : null;
  } catch {
    return null;
  }
}

export async function getSession(role: Role) {
  return decrypt((await cookies()).get(SESSION_COOKIES[role])?.value, role);
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await encrypt(payload, expiresAt);
  (await cookies()).set(SESSION_COOKIES[payload.role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession(role: Role) {
  (await cookies()).delete(SESSION_COOKIES[role]);
}

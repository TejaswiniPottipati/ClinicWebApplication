"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { api } from "@/lib/api";
import { createSession, deleteSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});

export type LoginState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
      email?: string;
    }
  | undefined;

const HOME: Record<Role, string> = { doctor: "/patients", patient: "/portal" };
const LOGIN: Record<Role, string> = { doctor: "/login", patient: "/portal/login" };

async function login(role: Role, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email, password } = parsed.data;
  const result = await api.login(email, password);
  // Each portal only accepts its own kind of account.
  if (!result || result.user.role !== role) {
    return { message: "Invalid email or password.", email };
  }

  await createSession({
    userId: result.user.id,
    name: result.user.name,
    role,
    accessToken: result.accessToken,
  });
  redirect(HOME[role]);
}

export async function loginDoctor(_state: LoginState, formData: FormData) {
  return login("doctor", formData);
}

export async function loginPatient(_state: LoginState, formData: FormData) {
  return login("patient", formData);
}

export async function logoutDoctor() {
  await deleteSession("doctor");
  redirect(LOGIN.doctor);
}

export async function logoutPatient() {
  await deleteSession("patient");
  redirect(LOGIN.patient);
}

"use server";

import { refresh } from "next/cache";
import * as z from "zod";
import { ApiError } from "@/lib/api";
import { discontinueMedication, prescribe } from "@/lib/dal";
import { MEDICATION_ROUTES } from "@/lib/types";

// Mirrors the API's PrescribeDto, so most mistakes are caught before a round trip.
const PrescriptionSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter the medication name." }).max(100),
  dosage: z.string().trim().min(1, { error: "Enter the dosage, e.g. 500 mg." }).max(50),
  frequency: z.string().trim().min(1, { error: "Enter how often, e.g. Twice daily." }).max(100),
  route: z.enum(MEDICATION_ROUTES, { error: "Choose a route." }),
  instructions: z.string().trim().max(500).optional(),
  startedOn: z.iso.date({ error: "Enter a valid start date." }),
});

type PrescriptionField = keyof z.infer<typeof PrescriptionSchema>;

export type PrescriptionState =
  | {
      ok?: boolean;
      errors?: Partial<Record<PrescriptionField, string[]>>;
      message?: string;
      /** What was submitted, to refill the form after an error. */
      values?: Partial<Record<PrescriptionField, string>>;
    }
  | undefined;

function apiMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status < 500) return err.message;
  if (err instanceof ApiError && err.status === 503) return err.message;
  console.error(err);
  return fallback;
}

export async function prescribeMedication(
  patientId: string,
  _state: PrescriptionState,
  formData: FormData,
): Promise<PrescriptionState> {
  const raw = Object.fromEntries(
    (["name", "dosage", "frequency", "route", "instructions", "startedOn"] as const).map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  ) as Record<PrescriptionField, string>;

  const parsed = PrescriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: raw };
  }

  const { instructions, ...rx } = parsed.data;
  try {
    await prescribe(String(patientId), { ...rx, ...(instructions ? { instructions } : {}) });
  } catch (err) {
    return { message: apiMessage(err, "Couldn't add the prescription. Please try again."), values: raw };
  }
  refresh();
  return { ok: true };
}

export async function stopMedication(patientId: string, medicationId: string): Promise<{ error?: string }> {
  try {
    await discontinueMedication(String(patientId), String(medicationId));
  } catch (err) {
    return { error: apiMessage(err, "Couldn't discontinue the medication. Please try again.") };
  }
  refresh();
  return {};
}

"use client";

import { useActionState, useState, type ReactNode } from "react";
import { prescribeMedication, type PrescriptionState } from "@/app/actions/medications";
import { MEDICATION_ROUTES } from "@/lib/types";

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 aria-invalid:border-rose-500";

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Every 6 hours",
  "Once daily at night",
  "As needed",
];

/** The doctor's local date as YYYY-MM-DD (the en-CA locale formats dates that way). */
const today = () => new Date().toLocaleDateString("en-CA");

interface PrescriptionFormProps {
  patientId: string;
  /** Shown as a reminder while prescribing. */
  allergies: string[];
}

/** "New prescription" button that expands into the prescribing form. */
export function PrescriptionForm({ patientId, allergies }: PrescriptionFormProps) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setAdded(null);
            setOpen(true);
          }}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          New prescription
        </button>
        {added && (
          <p role="status" className="text-sm text-emerald-700">
            {added} added.
          </p>
        )}
      </div>
    );
  }

  return (
    <Form
      patientId={patientId}
      allergies={allergies}
      onCancel={() => setOpen(false)}
      onAdded={(name) => {
        setAdded(name);
        setOpen(false);
      }}
    />
  );
}

function Form({
  patientId,
  allergies,
  onCancel,
  onAdded,
}: PrescriptionFormProps & { onCancel: () => void; onAdded: (name: string) => void }) {
  const [state, action, pending] = useActionState(async (prev: PrescriptionState, formData: FormData) => {
    const next = await prescribeMedication(patientId, prev, formData);
    if (next?.ok) onAdded(String(formData.get("name")).trim());
    return next;
  }, undefined);
  const [startedOn] = useState(today);
  const v = state?.values;
  const e = state?.errors;

  return (
    <form action={action} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">New prescription</h3>
        <p className={`text-xs ${allergies.length ? "font-medium text-rose-700" : "text-slate-500"}`}>
          {allergies.length ? `Allergies: ${allergies.join(", ")}` : "No known allergies"}
        </p>
      </div>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rx-name" label="Medication" error={e?.name}>
          <input
            id="rx-name"
            name="name"
            required
            autoFocus
            maxLength={100}
            defaultValue={v?.name}
            placeholder="e.g. Amoxicillin"
            aria-invalid={!!e?.name}
            aria-describedby={e?.name ? "rx-name-error" : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="rx-dosage" label="Dosage" error={e?.dosage}>
          <input
            id="rx-dosage"
            name="dosage"
            required
            maxLength={50}
            defaultValue={v?.dosage}
            placeholder="e.g. 500 mg"
            aria-invalid={!!e?.dosage}
            aria-describedby={e?.dosage ? "rx-dosage-error" : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="rx-frequency" label="Frequency" error={e?.frequency}>
          <input
            id="rx-frequency"
            name="frequency"
            required
            maxLength={100}
            list="rx-frequencies"
            defaultValue={v?.frequency}
            placeholder="e.g. Twice daily"
            aria-invalid={!!e?.frequency}
            aria-describedby={e?.frequency ? "rx-frequency-error" : undefined}
            className={inputClass}
          />
          <datalist id="rx-frequencies">
            {FREQUENCIES.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field id="rx-route" label="Route" error={e?.route}>
          <select
            id="rx-route"
            name="route"
            defaultValue={v?.route ?? "Oral"}
            aria-invalid={!!e?.route}
            aria-describedby={e?.route ? "rx-route-error" : undefined}
            className={inputClass}
          >
            {MEDICATION_ROUTES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field id="rx-started" label="Start date" error={e?.startedOn}>
          <input
            id="rx-started"
            name="startedOn"
            type="date"
            required
            defaultValue={v?.startedOn ?? startedOn}
            aria-invalid={!!e?.startedOn}
            aria-describedby={e?.startedOn ? "rx-started-error" : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="rx-instructions" label="Instructions (optional)" error={e?.instructions} wide>
          <textarea
            id="rx-instructions"
            name="instructions"
            rows={2}
            maxLength={500}
            defaultValue={v?.instructions}
            placeholder="e.g. Take with food. Complete the full course."
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add prescription"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">
          {error[0]}
        </p>
      )}
    </div>
  );
}

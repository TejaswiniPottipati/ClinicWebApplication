"use client";

import { useState, useTransition } from "react";
import { stopMedication } from "@/app/actions/medications";

interface DiscontinueButtonProps {
  patientId: string;
  medicationId: string;
  /** e.g. "Amlodipine 5 mg", for the confirmation prompt. */
  label: string;
}

export function DiscontinueButton({ patientId, medicationId, label }: DiscontinueButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Discontinue ${label}? It will move to medication history.`)) return;
          setError(null);
          startTransition(async () => {
            const result = await stopMedication(patientId, medicationId);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
      >
        {pending ? "Stopping…" : "Discontinue"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      )}
    </span>
  );
}

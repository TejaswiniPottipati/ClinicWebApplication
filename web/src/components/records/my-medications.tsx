import { MedicationDetails } from "@/components/records/record-sections";
import { formatDate } from "@/lib/format";
import type { Medication } from "@/lib/types";
import { MedicationUpdates } from "./medication-updates";

// The patient's own prescriptions, read-only. Doctors prescribe from the patient record.

export function MyMedications({ medications }: { medications: Medication[] }) {
  const active = medications.filter((m) => m.status === "active");
  const history = medications.filter((m) => m.status !== "active");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <MedicationUpdates />
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">My medications</p>
      {active.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No active medications.</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {active.map((m) => (
            <li key={m.id} className="py-3 last:pb-0">
              <MedicationDetails m={m} />
              <p className="mt-0.5 text-xs text-slate-400">Since {formatDate(m.startedOn)}</p>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
            Past medications ({history.length})
          </summary>
          <ul className="mt-1 divide-y divide-slate-100">
            {history.map((m) => (
              <li key={m.id} className="py-3 text-slate-500 last:pb-0">
                <MedicationDetails m={m} muted />
                <p className="mt-0.5 text-xs">
                  {formatDate(m.startedOn)} – {m.endedOn ? formatDate(m.endedOn) : "?"}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

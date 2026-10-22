import type { PatientStatus } from "@/lib/types";

const STYLES: Record<PatientStatus, string> = {
  Stable: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Follow-up": "bg-amber-50 text-amber-800 ring-amber-600/20",
  Critical: "bg-rose-50 text-rose-700 ring-rose-600/20",
  "Post-op": "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}

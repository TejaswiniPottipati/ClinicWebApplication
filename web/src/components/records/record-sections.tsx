import type { ReactNode } from "react";
import { DiscontinueButton } from "@/components/records/discontinue-button";
import { PrescriptionForm } from "@/components/records/prescription-form";
import { ageFrom, formatDate } from "@/lib/format";
import type { ImagingReport, LabFlag, LabResult, Medication, Patient } from "@/lib/types";

// Server-rendered sections of the patient record. Only the prescribing controls are client components.

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

// ---- Medications ------------------------------------------------------------------------

export function Medications({ patient }: { patient: Patient }) {
  const active = patient.medications.filter((m) => m.status === "active");
  const history = patient.medications.filter((m) => m.status !== "active");

  return (
    <Section title="Medications">
      <div className="space-y-4">
        {active.length === 0 ? (
          <Empty>No active medications.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                <MedicationDetails m={m} />
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-xs text-slate-400">Since {formatDate(m.startedOn)}</p>
                  <DiscontinueButton patientId={patient.id} medicationId={m.id} label={`${m.name} ${m.dosage}`} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <PrescriptionForm patientId={patient.id} allergies={patient.allergies} />

        {history.length > 0 && (
          <details className="group border-t border-slate-100 pt-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
              Medication history ({history.length})
            </summary>
            <ul className="mt-2 divide-y divide-slate-100">
              {history.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3 text-slate-500">
                  <MedicationDetails m={m} muted />
                  <p className="shrink-0 text-xs">
                    {formatDate(m.startedOn)} – {m.endedOn ? formatDate(m.endedOn) : "?"}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Section>
  );
}

export function MedicationDetails({ m, muted }: { m: Medication; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`font-medium ${muted ? "text-slate-600" : ""}`}>
        {m.name} <span className="font-normal text-slate-500">{m.dosage}</span>
      </p>
      <p className="text-sm text-slate-500">
        {m.frequency} · {m.route}
      </p>
      {m.instructions && <p className="mt-0.5 text-sm text-slate-600">{m.instructions}</p>}
      <p className="mt-0.5 text-xs text-slate-400">Prescribed by {m.prescribedBy.name}</p>
    </div>
  );
}

// ---- Lab results ------------------------------------------------------------------------

const FLAG_STYLES: Record<LabFlag, { badge: string; value: string; label: string }> = {
  normal: { badge: "", value: "text-slate-900", label: "" },
  low: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", value: "text-amber-800 font-semibold", label: "Low" },
  high: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", value: "text-amber-800 font-semibold", label: "High" },
  critical: {
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    value: "text-rose-700 font-semibold",
    label: "Critical",
  },
};

export function LabResults({ results }: { results: LabResult[] }) {
  if (results.length === 0) {
    return (
      <Section title="Lab results">
        <Empty>No lab results on file.</Empty>
      </Section>
    );
  }
  // Already newest first; group by collection date.
  const byDate = Map.groupBy(results, (r) => r.collectedOn);

  return (
    <Section title="Lab results">
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <th scope="col" className="px-5 py-2 font-medium">Test</th>
              <th scope="col" className="px-3 py-2 font-medium">Result</th>
              <th scope="col" className="px-3 py-2 font-medium">Reference</th>
              <th scope="col" className="px-5 py-2 font-medium">
                <span className="sr-only">Flag</span>
              </th>
            </tr>
          </thead>
          {[...byDate].map(([date, rows]) => (
            <tbody key={date} className="border-b border-slate-100 last:border-0">
              <tr>
                <th colSpan={4} scope="colgroup" className="bg-slate-50 px-5 py-1.5 text-left text-xs font-medium text-slate-600">
                  Collected {formatDate(date)}
                </th>
              </tr>
              {rows.map((r) => {
                const flag = FLAG_STYLES[r.flag];
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-2">{r.test}</td>
                    <td className={`px-3 py-2 whitespace-nowrap tabular-nums ${flag.value}`}>
                      {r.value} <span className="font-normal text-slate-500">{r.unit}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500 tabular-nums">{r.referenceRange}</td>
                    <td className="px-5 py-2 text-right">
                      {flag.label && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${flag.badge}`}
                        >
                          {flag.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </Section>
  );
}

// ---- Imaging ----------------------------------------------------------------------------

export function ImagingReports({ reports }: { reports: ImagingReport[] }) {
  return (
    <Section title="Imaging reports">
      {reports.length === 0 ? (
        <Empty>No imaging on file.</Empty>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  <span className="mr-2 inline-flex rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/20 ring-inset">
                    {r.modality}
                  </span>
                  {r.study}
                </p>
                <p className="text-xs text-slate-500">{formatDate(r.performedOn)}</p>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-medium text-slate-700">Impression: </span>
                {r.impression}
              </p>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-800">Findings</summary>
                <p className="mt-1 text-sm text-slate-600">{r.findings}</p>
              </details>
              <p className="mt-2 text-xs text-slate-400">Reported by {r.reportedBy}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---- Demographics -----------------------------------------------------------------------

export function Demographics({ patient }: { patient: Patient }) {
  const ec = patient.emergencyContact;
  return (
    <Section title="Demographics">
      <dl className="space-y-2 text-sm">
        <Field label="Date of birth" value={`${formatDate(patient.dateOfBirth)} (${ageFrom(patient.dateOfBirth)} yrs)`} />
        <Field label="Gender" value={patient.gender} />
        <Field label="Blood type" value={patient.bloodType} />
        <Field label="Language" value={patient.preferredLanguage ?? "Not recorded"} />
        <Field label="Phone" value={patient.phone} />
        <Field label="Email (portal login)" value={patient.email} />
        <Field label="Address" value={patient.address ?? "Not recorded"} wrap />
      </dl>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Emergency contact</p>
        {ec ? (
          <p className="text-sm">
            {ec.name} <span className="text-slate-500">({ec.relationship})</span>
            <br />
            <span className="text-slate-600">{ec.phone}</span>
          </p>
        ) : (
          <Empty>None on file.</Empty>
        )}
      </div>
    </Section>
  );
}

function Field({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-right ${wrap ? "" : "truncate"}`}>{value}</dd>
    </div>
  );
}

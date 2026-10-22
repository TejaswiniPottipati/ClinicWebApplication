import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getMyPatients } from "@/lib/dal";
import { ageFrom, formatDate, formatDateTime } from "@/lib/format";
import { PATIENT_STATUSES, type PatientStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Patients" };

export default function PatientsPage({ searchParams }: PageProps<"/patients">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My patients</h1>
        <p className="mt-1 text-sm text-slate-500">
          Patients assigned to you. Select a patient to open their record.
        </p>
      </div>
      <Suspense fallback={<PatientsSkeleton />}>
        <PatientsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function PatientsView({
  searchParams,
}: {
  searchParams: PageProps<"/patients">["searchParams"];
}) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const rawStatus = first(params.status);
  const status = PATIENT_STATUSES.find((s) => s === rawStatus);

  const [all, patients] = await Promise.all([
    getMyPatients(),
    getMyPatients({ q, status }),
  ]);

  const now = new Date();
  const counts = Object.fromEntries(
    PATIENT_STATUSES.map((s) => [s, all.filter((p) => p.status === s).length]),
  ) as Record<PatientStatus, number>;
  const upcoming = all.filter((p) => p.nextAppointment).length;

  function filterHref(next?: PatientStatus) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (next) sp.set("status", next);
    const qs = sp.toString();
    return qs ? `/patients?${qs}` : "/patients";
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total patients" value={all.length} />
        <Stat label="Upcoming appointments" value={upcoming} />
        <Stat label="Needs follow-up" value={counts["Follow-up"]} />
        <Stat label="Critical" value={counts.Critical} tone="alert" />
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/patients" className="flex w-full gap-2 sm:max-w-sm" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search patients
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search name, ID or condition"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          <FilterChip href={filterHref()} active={!status} label="All" count={all.length} />
          {PATIENT_STATUSES.map((s) => (
            <FilterChip
              key={s}
              href={filterHref(s)}
              active={status === s}
              label={s}
              count={counts[s]}
            />
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {patients.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium">No patients match your filters</p>
            <Link href="/patients" className="mt-2 inline-block text-sm text-teal-700 hover:underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Patient</th>
                  <th scope="col" className="px-4 py-3 font-medium">Age / Sex</th>
                  <th scope="col" className="px-4 py-3 font-medium">Conditions</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last visit</th>
                  <th scope="col" className="px-4 py-3 font-medium">Next appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="group relative hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/patients/${p.id}`}
                        className="font-medium text-slate-900 after:absolute after:inset-0 group-hover:text-teal-700"
                      >
                        {p.name}
                      </Link>
                      <p className="font-mono text-xs text-slate-500">{p.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ageFrom(p.dateOfBirth, now)} · {p.gender[0]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.conditions.join(", ")}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.lastVisit)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.nextAppointment ? formatDateTime(p.nextAppointment) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Showing {patients.length} of {all.length} patients
      </p>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "alert" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${tone === "alert" && value > 0 ? "text-rose-600" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        active
          ? "bg-teal-600 text-white ring-teal-600"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label} <span className={active ? "text-teal-100" : "text-slate-400"}>{count}</span>
    </Link>
  );
}

function PatientsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading patients">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-slate-200/60" />
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
    </div>
  );
}

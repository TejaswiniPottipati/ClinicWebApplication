import Link from "next/link";
import { Suspense } from "react";
import { CallButtons } from "@/components/calls/call-buttons";
import { Conversation } from "@/components/chat/conversation";
import {
  Section as Card,
  Demographics,
  Empty,
  ImagingReports,
  LabResults,
  Medications,
} from "@/components/records/record-sections";
import { StatusBadge } from "@/components/status-badge";
import { getMyPatient, getPatientConversation } from "@/lib/dal";
import { ageFrom, formatDate, formatDateTime, initials } from "@/lib/format";

export default function PatientPage({ params }: PageProps<"/patients/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/patients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <span aria-hidden>←</span> All patients
      </Link>
      <Suspense fallback={<RecordSkeleton />}>
        <PatientRecord params={params} />
      </Suspense>
    </div>
  );
}

async function PatientRecord({ params }: { params: PageProps<"/patients/[id]">["params"] }) {
  const { id } = await params;
  const patientId = decodeURIComponent(id);
  const [patient, messages] = await Promise.all([
    getMyPatient(patientId),
    getPatientConversation(patientId),
  ]);

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg font-semibold text-teal-700 ring-1 ring-teal-600/20">
            {initials(patient.name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              <span className="font-mono">{patient.id}</span> · {ageFrom(patient.dateOfBirth)} yrs ·{" "}
              {patient.gender} · Blood type {patient.bloodType}
            </p>
          </div>
        </div>
        <CallButtons patientId={patient.id} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section
            id="messages"
            className="flex h-[480px] scroll-mt-20 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
              Messages
            </h2>
            <Conversation
              patientId={patient.id}
              counterpartName={patient.name.split(" ")[0]}
              initialMessages={messages}
              className="flex-1"
            />
          </section>

          <Medications patient={patient} />
          <LabResults results={patient.labResults} />
          <ImagingReports reports={patient.imagingReports} />

          <Card title="Visit history">
            <ol className="space-y-4">
              {patient.visits.map((v) => (
                <li key={v.date} className="relative border-l-2 border-slate-200 pl-4">
                  <p className="text-xs text-slate-500">{formatDate(v.date)}</p>
                  <p className="font-medium">{v.reason}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{v.notes}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Next appointment">
            {patient.nextAppointment ? (
              <p className="text-lg font-medium">{formatDateTime(patient.nextAppointment)}</p>
            ) : (
              <Empty>None scheduled.</Empty>
            )}
            <p className="mt-1 text-xs text-slate-500">Last visit {formatDate(patient.lastVisit)}</p>
          </Card>

          <Card title="Conditions">
            <TagList items={patient.conditions} empty="No recorded conditions." />
          </Card>

          <Card title="Allergies">
            <TagList items={patient.allergies} empty="No known allergies." tone="alert" />
          </Card>

          <Demographics patient={patient} />
        </div>
      </div>
    </>
  );
}

function TagList({ items, empty, tone }: { items: string[]; empty: string; tone?: "alert" }) {
  if (items.length === 0) return <Empty>{empty}</Empty>;
  const color =
    tone === "alert"
      ? "bg-rose-50 text-rose-700 ring-rose-600/20"
      : "bg-slate-50 text-slate-700 ring-slate-500/20";
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RecordSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading patient record">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

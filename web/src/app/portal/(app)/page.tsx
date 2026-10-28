import type { Metadata } from "next";
import { Suspense } from "react";
import { Conversation } from "@/components/chat/conversation";
import { PhoneIcon } from "@/components/icons";
import { MyMedications } from "@/components/records/my-medications";
import { getMyCareTeam, getMyConversation, getMyMedications } from "@/lib/dal";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "My care" };

export default function PortalHome() {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <PortalView />
    </Suspense>
  );
}

async function PortalView() {
  const [{ doctor, patient }, messages, medications] = await Promise.all([
    getMyCareTeam(),
    getMyConversation(),
    getMyMedications(),
  ]);

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Your doctor</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 font-semibold text-white">
              {initials(doctor.name)}
            </span>
            <div>
              <p className="font-semibold">{doctor.name}</p>
              <p className="text-sm text-slate-500">{doctor.specialty}</p>
            </div>
          </div>
        </section>

        <MyMedications medications={medications} />

        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
          <p className="flex items-center gap-2 font-medium">
            <PhoneIcon width={16} height={16} /> Consultations
          </p>
          <p className="mt-1.5 text-teal-800">
            {doctor.name} will call you here for audio or video consultations. Keep this page open
            around your appointment time, and allow microphone and camera access when asked.
          </p>
        </section>
      </aside>

      <section className="flex h-[calc(100dvh-8.5rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h1 className="font-semibold">Messages</h1>
          <p className="text-xs text-slate-500">
            Conversation with {doctor.name}. For emergencies, call your local emergency number.
          </p>
        </header>
        <Conversation
          patientId={patient.id}
          counterpartName={doctor.name}
          initialMessages={messages}
          className="flex-1"
        />
      </section>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[280px_1fr]" aria-busy="true" aria-label="Loading">
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="h-[60vh] animate-pulse rounded-2xl bg-slate-200/60" />
    </div>
  );
}

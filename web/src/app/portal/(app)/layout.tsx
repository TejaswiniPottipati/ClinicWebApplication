import Link from "next/link";
import { Suspense } from "react";
import { logoutPatient } from "@/app/actions/auth";
import { CallProvider } from "@/components/calls/call-provider";
import { ConnectionStatus, RealtimeProvider } from "@/components/realtime/realtime-provider";
import { getMyCareTeam } from "@/lib/dal";
import { initials } from "@/lib/format";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <RealtimeProvider role="patient">
      <CallProvider>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
            <Link href="/portal" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-sm text-white">
                +
              </span>
              CWA Clinic
              <span className="hidden font-normal text-slate-400 sm:inline">· Patient portal</span>
            </Link>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <Suspense fallback={<div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100" />}>
                <PatientMenu />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
      </CallProvider>
    </RealtimeProvider>
  );
}

async function PatientMenu() {
  const { patient } = await getMyCareTeam();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium sm:block">{patient.name}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 ring-1 ring-teal-600/20">
        {initials(patient.name)}
      </span>
      <form action={logoutPatient}>
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

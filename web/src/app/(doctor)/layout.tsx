import Link from "next/link";
import { Suspense } from "react";
import { logoutDoctor } from "@/app/actions/auth";
import { CallProvider } from "@/components/calls/call-provider";
import { ConnectionStatus, RealtimeProvider } from "@/components/realtime/realtime-provider";
import { requireDoctor } from "@/lib/dal";
import { initials } from "@/lib/format";

export default function DoctorLayout({ children }: LayoutProps<"/">) {
  return (
    // Lives in the layout so a call stays connected while the doctor moves between pages.
    <RealtimeProvider role="doctor">
      <CallProvider>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <Link href="/patients" className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-sm text-white">
                +
              </span>
              CWA Clinic
            </Link>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              {/* The session read streams in so the shell renders immediately. */}
              <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100" />}>
                <DoctorMenu />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </CallProvider>
    </RealtimeProvider>
  );
}

async function DoctorMenu() {
  const doctor = await requireDoctor();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{doctor.name}</p>
        <p className="text-xs text-slate-500">Doctor</p>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 ring-1 ring-teal-600/20">
        {initials(doctor.name)}
      </span>
      <form action={logoutDoctor}>
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

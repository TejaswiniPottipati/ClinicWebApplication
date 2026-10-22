import Link from "next/link";
import type { ReactNode } from "react";

/** Shared frame for the doctor and patient sign-in pages. */
export function AuthCard({
  title,
  subtitle,
  children,
  demo,
  switchTo,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  demo: ReactNode;
  switchTo: { href: string; label: string };
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-lg font-semibold text-white"
            aria-label="CWA Clinic home"
          >
            +
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-600">
          <p className="mb-2 font-medium text-slate-700">Demo accounts</p>
          {demo}
          <p className="mt-2">
            Password: <span className="font-mono">Password123!</span>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href={switchTo.href} className="font-medium text-teal-700 hover:underline">
            {switchTo.label} →
          </Link>
        </p>
      </div>
    </main>
  );
}

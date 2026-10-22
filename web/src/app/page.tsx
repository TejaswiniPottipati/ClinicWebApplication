import Link from "next/link";

const PORTALS = [
  {
    href: "/portal/login",
    title: "I'm a patient",
    body: "Message your doctor and answer audio or video consultations.",
  },
  {
    href: "/login",
    title: "I'm a doctor",
    body: "View patient records, message patients and start consultations.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-xl font-semibold text-white">
          +
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">CWA Clinic</h1>
        <p className="mt-2 text-slate-500">Choose how you&apos;d like to sign in.</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PORTALS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-teal-600 hover:shadow-md"
            >
              <h2 className="font-semibold group-hover:text-teal-700">{p.title} →</h2>
              <p className="mt-1 text-sm text-slate-500">{p.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

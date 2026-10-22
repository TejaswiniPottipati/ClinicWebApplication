import Link from "next/link";

export default function PatientNotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Patient not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        This record doesn&apos;t exist or isn&apos;t assigned to you.
      </p>
      <Link href="/patients" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline">
        Back to my patients
      </Link>
    </div>
  );
}

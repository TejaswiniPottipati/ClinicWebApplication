import type { Metadata } from "next";
import { loginPatient } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Patient sign in" };

export default function PatientLoginPage() {
  return (
    <AuthCard
      title="Patient portal"
      subtitle="Message your doctor and join consultations"
      switchTo={{ href: "/login", label: "Doctor? Sign in to the doctor portal" }}
      demo={
        <>
          <ul className="space-y-1 font-mono">
            <li>aarav.johnson@mail.test</li>
            <li>aarav.chen@mail.test</li>
          </ul>
          <p className="mt-2">
            The first is Dr. Rao&apos;s patient (P-1001), the second Dr. Okafor&apos;s (P-1021). Any
            patient&apos;s email works; doctors can see them on each patient record.
          </p>
        </>
      }
    >
      <LoginForm action={loginPatient} emailPlaceholder="you@example.com" />
    </AuthCard>
  );
}

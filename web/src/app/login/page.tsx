import type { Metadata } from "next";
import { loginDoctor } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Doctor sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="CWA Clinic"
      subtitle="Sign in to the doctor portal"
      switchTo={{ href: "/portal/login", label: "Patient? Go to the patient portal" }}
      demo={
        <ul className="space-y-1 font-mono">
          <li>physician@clinic.test</li>
          <li>surgeon@clinic.test</li>
        </ul>
      }
    >
      <LoginForm action={loginDoctor} emailPlaceholder="you@clinic.test" />
    </AuthCard>
  );
}

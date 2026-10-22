"use client";

import { useActionState } from "react";
import type { LoginState } from "@/app/actions/auth";

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 aria-invalid:border-rose-500";

interface LoginFormProps {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  emailPlaceholder: string;
}

export function LoginForm({ action: loginAction, emailPlaceholder }: LoginFormProps) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
          aria-invalid={!!state?.errors?.email}
          aria-describedby={state?.errors?.email ? "email-error" : undefined}
          className={inputClass}
          placeholder={emailPlaceholder}
        />
        {state?.errors?.email && (
          <p id="email-error" className="mt-1 text-xs text-rose-600">
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state?.errors?.password}
          aria-describedby={state?.errors?.password ? "password-error" : undefined}
          className={inputClass}
        />
        {state?.errors?.password && (
          <p id="password-error" className="mt-1 text-xs text-rose-600">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

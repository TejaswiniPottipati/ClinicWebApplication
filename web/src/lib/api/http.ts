import "server-only";
import type { AuthResult, CareTeam, Patient, PatientSummary } from "@/lib/types";
import type { ClinicApi } from "./index";

// Client for the NestJS API. Endpoint shapes here define the contract the API must implement:
//   POST /auth/login        { email, password } -> AuthResult (doctor or patient)
//   GET  /patients?q&status -> PatientSummary[]   (scoped to the authenticated doctor)
//   GET  /patients/:id      -> Patient            (404 if not the doctor's patient)
//   GET  /me/care-team      -> CareTeam           (authenticated patient)
export function httpApi(baseUrl: string): ClinicApi {
  function request(path: string, init: RequestInit = {}, token?: string) {
    return fetch(new URL(path, baseUrl), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  }

  return {
    async login(email, password) {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`Login failed: ${res.status}`);
      return (await res.json()) as AuthResult;
    },

    async listPatients(ctx, query = {}) {
      const params = new URLSearchParams();
      if (query.q) params.set("q", query.q);
      if (query.status) params.set("status", query.status);
      const res = await request(`/patients?${params}`, {}, ctx.accessToken);
      if (!res.ok) throw new Error(`Failed to load patients: ${res.status}`);
      return (await res.json()) as PatientSummary[];
    },

    async getPatient(ctx, id) {
      const res = await request(`/patients/${encodeURIComponent(id)}`, {}, ctx.accessToken);
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new Error(`Failed to load patient: ${res.status}`);
      return (await res.json()) as Patient;
    },

    async getCareTeam(ctx) {
      const res = await request("/me/care-team", {}, ctx.accessToken);
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new Error(`Failed to load care team: ${res.status}`);
      return (await res.json()) as CareTeam;
    },
  };
}

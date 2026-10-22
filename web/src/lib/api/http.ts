import "server-only";
import type {
  AuthResult,
  Call,
  CareTeam,
  Message,
  Patient,
  PatientSummary,
} from "@/lib/types";
import type { ClinicApi } from "./index";

/** A failed API request, carrying the API's status code and a message safe to show users. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

function baseUrl() {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set. Copy .env.example to .env.local.");
  return url;
}

async function errorMessage(res: Response) {
  // NestJS errors look like { statusCode, message: string | string[], error }.
  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return message ?? res.statusText ?? "Request failed.";
}

async function send(path: string, { method = "GET", body, token, signal }: RequestOptions = {}) {
  let res: Response;
  try {
    res = await fetch(new URL(path, baseUrl()), {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(503, "The clinic service is unavailable. Please try again shortly.");
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res;
}

async function json<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await (await send(path, options)).json()) as T;
}

/** Turns a 404 into null, for lookups where "not found" is an expected answer. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

const conversation = (patientId: string) => `/conversations/${encodeURIComponent(patientId)}/messages`;
const callPath = (callId: string, action: string) => `/calls/${encodeURIComponent(callId)}/${action}`;

/** Client for the NestJS clinic API at API_URL. Only used server-side; browsers never call the API. */
export function httpApi(): ClinicApi {
  return {
    async login(email, password) {
      try {
        return await json<AuthResult>("/auth/login", { method: "POST", body: { email, password } });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 400)) return null;
        throw err;
      }
    },

    listPatients(ctx, query = {}) {
      const params = new URLSearchParams();
      if (query.q) params.set("q", query.q);
      if (query.status) params.set("status", query.status);
      return json<PatientSummary[]>(`/patients?${params}`, { token: ctx.accessToken });
    },

    getPatient(ctx, id) {
      return orNull(json<Patient>(`/patients/${encodeURIComponent(id)}`, { token: ctx.accessToken }));
    },

    getCareTeam(ctx) {
      return orNull(json<CareTeam>("/me/care-team", { token: ctx.accessToken }));
    },

    listMessages(ctx, patientId) {
      return json<Message[]>(conversation(patientId), { token: ctx.accessToken });
    },

    sendMessage(ctx, patientId, body) {
      return json<Message>(conversation(patientId), { method: "POST", body: { body }, token: ctx.accessToken });
    },

    startCall(ctx, patientId, kind) {
      return json<Call>("/calls", { method: "POST", body: { patientId, kind }, token: ctx.accessToken });
    },

    updateCall(ctx, callId, action, failed) {
      return json<Call>(callPath(callId, action), {
        method: "POST",
        body: action === "end" && failed ? { failed: true } : {},
        token: ctx.accessToken,
      });
    },

    async signal(ctx, callId, data) {
      await send(callPath(callId, "signal"), { method: "POST", body: data, token: ctx.accessToken });
    },

    openEvents(ctx, signal) {
      return send("/events", { token: ctx.accessToken, signal });
    },
  };
}

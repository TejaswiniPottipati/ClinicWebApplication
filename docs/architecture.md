# Architecture

```
browser ──(session cookie)──► web (Next.js) ──(Bearer JWT)──► api (NestJS) ──► repositories ──► PostgreSQL
```

The browser only talks to `web/`. Its server code forwards requests to the API with the user's access token (backend-for-frontend), so the API is never called from browsers and needs no CORS.

## Key decisions

- **Backend-for-frontend:** the API token stays in an httpOnly cookie on the web server, never in browser JavaScript.
- **JWT + role-based access:** global guards check the token and role on every API route; services also check that the record belongs to the user.
- **Server-Sent Events** for live updates: plain HTTP, reconnects automatically. Sending uses normal POST requests.
- **Peer-to-peer WebRTC** for one-to-one calls, with Cloudflare TURN (free tier) when networks block direct connections.
- **Repository pattern:** Postgres in production, in-memory data in tests.
- **API on Render, web on Vercel:** the API keeps live connections and timers in memory, so it needs an always-on server.

## Limitations

- Demo data only; labs and imaging are read-only.
- One API instance (live events are kept in memory; scaling out needs Redis).
- One-to-one calls only; no recording.
- Sessions can't be revoked before they expire (8 hours).

## Authentication and access control

- **Login:** `POST /auth/login` checks the password (scrypt hash, constant-time compare) and returns an 8-hour JWT signed with `JWT_SECRET`.
- **Session:** `web` stores that token in a signed, httpOnly, `Secure`, `SameSite=Lax` cookie (`SESSION_SECRET`), one cookie per role, so the doctor and patient portals have separate sessions.
- **Checks, in order:**
  1. `web/src/proxy.ts`: redirects signed-out users to the right login page.
  2. `web/src/lib/dal.ts` and `lib/bff.ts`: verify the session before any data is loaded; attach the token as `Authorization: Bearer`.
  3. API `JwtAuthGuard`: every route needs a valid token unless marked `@Public()` (`401`).
  4. API `RolesGuard`: `@Roles('doctor')` / `@Roles('patient')` (`403`).
  5. Services check ownership: doctors see only their own patients; patients only their own conversation and calls (`404`). `/me/*` routes take the patient's ID from the token, never the URL.

## API

All routes need `Authorization: Bearer <token>` except `POST /auth/login` and `GET /health`. Request bodies are validated; unknown fields are rejected.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | anyone | `{ email, password }` → `{ user, accessToken }` |
| `GET` | `/patients?q&status` | doctor | Own patients (summaries) |
| `GET` | `/patients/:id` | doctor | Full record; `404` if not the doctor's patient |
| `POST` | `/patients/:id/medications` | doctor | New prescription; `409` if that drug is already active |
| `POST` | `/patients/:id/medications/:medicationId/discontinue` | doctor | End a prescription; `409` if already ended |
| `GET` | `/me/care-team` | patient | The patient and their doctor |
| `GET` | `/me/medications` | patient | The patient's own prescriptions (active first, then history) |
| `GET` · `POST` | `/conversations/:patientId/messages` | participant | Message history · send `{ body }` |
| `POST` | `/calls` | doctor | `{ patientId, kind: audio\|video }` → ringing call |
| `POST` | `/calls/:id/accept` · `/decline` | patient | Answer or refuse |
| `POST` | `/calls/:id/end` | participant | Hang up; `{ failed? }` |
| `POST` | `/calls/:id/signal` | participant | WebRTC offer/answer/ICE candidate for the other side |
| `GET` | `/calls/:id/ice-servers` | participant | STUN, plus short-lived Cloudflare TURN credentials when configured |
| `GET` | `/events` | any | Server-Sent Events stream |
| `GET` | `/health` | anyone | Liveness |

## Database

Prisma 7 on PostgreSQL 17. Tables: `users`, `doctors`, `patients`, `conditions`, `allergies`, `medications`, `lab_results`, `imaging_reports`, `visits`, `messages`, `calls`.

- `doctors` and `patients` share their primary key with `users` (one-to-one): login data lives in `users`, role-specific data in the other two.
- Services depend on abstract repositories (`api/src/data/`). Production uses the Prisma implementations; tests use in-memory ones over `mock-data.ts`, so tests need no database.

## Real-time

- **Transport:** each signed-in tab opens one `EventSource` to `web` (`/api/realtime`), which pipes the API's `GET /events` stream through. Events are `message`, `call`, `signal` and `medication`; a `ping` every 20 s keeps the connection open. `EventSource` reconnects on its own and the chat refetches history afterwards.
- **Sending** uses normal POST requests, so it reuses the same authentication, validation and error handling as the rest of the API.
- **Event bus:** `RealtimeService` publishes events to per-user channels (`doctor:<id>`, `patient:<id>`) in memory. A message is saved to the database, then published to both participants. A prescription change is published to the patient, whose portal re-renders its medication list. Because the bus is in memory, the API runs as a single instance; scaling out would need Redis pub/sub.

## Calls

- **State machine** (`CallsService`, decided on the server): `ringing → active → ended`. End reasons: `completed`, `declined`, `missed` (30 s), `cancelled`, `failed` (media error, or a participant disconnected for over 5 s). One live call per person; state changes to a call are serialized.
- **Media** is peer-to-peer WebRTC: the server only relays setup messages. The doctor sends the offer once the patient accepts.
- **TURN:** when networks block a direct connection, media goes through Cloudflare TURN (see [development.md](development.md#calls-and-turn)). The API issues 4-hour credentials only to participants of a live call.
- **Recovery:** a dropped connection gets one ICE restart and 10 s to recover; a call that never connects ends as `failed` after 30 s.

## Code layout

**`api/src/`**
- `auth/`: login, JWT, global `JwtAuthGuard` and `RolesGuard`.
- `data/`: repository interfaces; `prisma/` (Postgres) and `memory/` (tests) implementations.
- `patients/`, `messages/`, `calls/`, `realtime/`: one module per feature.
- `common/`: shared types, auth decorators, password hashing.
- `../prisma/`: `schema.prisma`, migrations, `seed.ts`.

**`web/src/`**
- `proxy.ts`: login redirects.
- `lib/session.ts`, `lib/dal.ts`, `lib/bff.ts`, `lib/api/`: sessions, data access, API client.
- `app/(doctor)/`, `app/portal/`: doctor and patient pages. `app/api/`: routes that forward to the API.
- `components/realtime/`, `components/calls/`, `components/chat/`, `components/records/`: UI.

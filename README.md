# CWA Clinic

Demo clinic web application. The clinic has two doctors, a Physician and a Surgeon, each with 20 patients. Doctors view patient records, message patients and run audio/video consultations. Patients use a separate portal to message their doctor and answer calls.

| Folder | What | Status |
| --- | --- | --- |
| `web/` | Next.js 16 client (React 19, TypeScript, Tailwind) | Doctor portal, patient portal, messaging, audio/video calls |
| `api/` | NestJS 12 API (TypeScript, ESM), Prisma 7, PostgreSQL 17 | Auth, patients, messaging, calls, real-time events |

```
browser ──(session cookie)──► web (Next.js, :3000) ──(Bearer JWT)──► api (NestJS, :4000) ──► repositories ──► PostgreSQL (Docker, :5432)
```

The browser only ever talks to `web/`. Its route handlers forward requests to the API with the user's access token (backend-for-frontend), so the API is never exposed to browsers and needs no CORS.

## Current status

**Done:**
- Separate sign-in pages and sessions for doctors (`/login`) and patients (`/portal/login`). The API issues JWTs; passwords are stored as scrypt hashes.
- Doctor dashboard: patient list with search and status filters, and a patient record view. Each doctor sees only their own patients.
- Real-time messaging between each patient and their doctor.
- Audio/video calls: the doctor calls, the patient can accept or decline, and either side can end the call. Every call is logged in the chat.

**Known limitations:**
- **Demo data.** Doctors, patients and records come from `api/src/data/mock-data.ts`, loaded by the seed script. Medications are read-only for now.
- **Single API instance.** Real-time fan-out is in-process, so running several API instances needs a shared broker (e.g. Redis pub/sub).
- **Calls are peer-to-peer WebRTC with STUN only.** There's no TURN relay or SFU, so calls fail when the network blocks direct connectivity (symmetric NAT, strict firewalls).
- **No unread indicators.** A doctor only sees a patient's new messages when that patient's record is open.
- **Portal must be open for calls.** A patient only receives a call while the portal is open in their browser.

## Run locally

Requirements: Node.js 22 LTS (20.19 minimum), Docker.

```bash
# 1. API (terminal 1)
cd api
cp .env.example .env         # then set JWT_SECRET (openssl rand -base64 48); DATABASE_URL matches docker-compose.yml
npm install                  # also generates the Prisma client (src/generated/, git-ignored)
npm run db:up                # Postgres 17 in Docker (container cwa-postgres, volume postgres-data)
npm run db:deploy            # apply migrations in prisma/migrations/
npm run db:seed              # load the demo clinic from mock-data.ts
npm run start:dev            # http://localhost:4000

# 2. Web (terminal 2)
cd web
cp .env.example .env.local   # then set SESSION_SECRET (openssl rand -base64 32); API_URL defaults to :4000
npm install
npm run dev                  # http://localhost:3000
```

### Database

| Command (in `api/`) | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | Start / stop the Postgres container. Data persists in the `postgres-data` volume (`docker compose down -v` deletes it). |
| `npm run db:migrate -- --name <change>` | After editing `prisma/schema.prisma`: generate a SQL migration in `prisma/migrations/` and apply it. Commit the migration. |
| `npm run db:deploy` | Apply pending migrations without generating new ones (CI, production). |
| `npm run db:seed` | Load the demo data. Re-runnable: resets accounts and records, keeps messages. |
| `npm run db:reset` | Drop all data, re-apply every migration. Then `db:seed`. |
| `npm run db:studio` | Browse the tables in Prisma Studio. |

Tables: `users`, `doctors`, `patients`, `conditions`, `allergies`, `medications`, `visits`, `messages`, `calls`. A call-log message references its call (`messages.call_id`). On startup the API ends calls left ringing or active by a previous run as `failed`.

If `npm install` in `api/` fails with `Cannot read properties of null (reading 'edgesOut')`, that's an npm 10 bug. Use `npx npm@11 install` instead.

Demo logins (password `Password123!` for all):

| Portal | URL | Accounts |
| --- | --- | --- |
| Doctor | `/login` | `physician@clinic.test`, `surgeon@clinic.test` |
| Patient | `/portal/login` | `aarav.johnson@mail.test` (Dr. Rao's), `aarav.chen@mail.test` (Dr. Okafor's). Every patient's email is shown on their record. |

### Try messaging and calls

Doctors and patients have separate session cookies, so both can be signed in in one browser:

1. Tab 1: sign in as `physician@clinic.test` and open patient **P-1001**.
2. Tab 2: sign in to the patient portal as `aarav.johnson@mail.test`.
3. Send messages either way; they appear instantly.
4. From the doctor tab click **Video call** or **Audio call**. The patient tab rings: **Accept** or **Decline**. During the call: mute, camera on/off, **End call**.

Calls need microphone (and camera) permission and only work on `localhost` or https.

### Tests

```bash
cd api
npm test           # unit: call ring timeout, disconnect grace, concurrency (fake timers)
npm run test:e2e   # e2e over HTTP + SSE: auth, access rules, messaging, call flow, validation
```

Tests need no database: they replace `DataModule` with `MemoryDataModule` (in-memory repositories over the mock data), so every run starts from the same demo clinic.

## API

All routes need `Authorization: Bearer <token>` except `POST /auth/login` and `GET /health`. Request bodies are validated (unknown fields are rejected).

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | anyone | `{ email, password }` → `{ user, accessToken }` (8 h JWT) |
| `GET` | `/patients?q&status` | doctor | Own patients (summaries) |
| `GET` | `/patients/:id` | doctor | Full record; `404` if not the doctor's patient |
| `GET` | `/me/care-team` | patient | The patient and their doctor |
| `GET` | `/conversations/:patientId/messages` | doctor, patient | History; only the two participants |
| `POST` | `/conversations/:patientId/messages` | doctor, patient | `{ body }` → message, pushed to both |
| `POST` | `/calls` | doctor | `{ patientId, kind: audio\|video }` → ringing call |
| `POST` | `/calls/:id/accept` · `/decline` | patient | Answer or refuse a ringing call |
| `POST` | `/calls/:id/end` | participant | `{ failed? }`; cancels if still ringing |
| `POST` | `/calls/:id/signal` | participant | WebRTC SDP offer/answer or ICE candidate for the other side |
| `GET` | `/events` | any | Server-Sent Events stream (see below) |
| `GET` | `/health` | anyone | Liveness |

## Real-time architecture

- **Transport:** each signed-in tab opens one `EventSource` to `web` (`GET /api/realtime?role=doctor|patient`). `web` pipes the API's `GET /events` stream through; closing the tab aborts the upstream request. Events are JSON `RealtimeEvent`s (`message`, `call`, `signal`); named `ping` events every 20 s keep connections open. On reconnect the chat refetches history.
- **Event bus:** `RealtimeService` (`api/src/realtime/`) fans events out per user (`doctor:<id>`, `patient:<id>`). On connect it replays the user's live call; after 5 s with no open stream it reports the user as disconnected.
- **Call state machine** (`CallsService`, server-authoritative):
  - `ringing → active → ended`
  - End reasons: `completed`, `declined`, `missed` (30 s ring timeout), `cancelled` (caller hung up while ringing), `failed` (media error, or a participant disconnected for over 5 s).
  - One live call per doctor and per patient (`409` otherwise).
  - State changes to a call are serialized (per-call lock), so e.g. an accept can't race the ring timeout.
  - Each ended call is appended to the conversation as a call-log message.
- **WebRTC:**
  - Peer-to-peer `RTCPeerConnection`; STUN only (`stun.l.google.com`), no TURN, no SFU.
  - The doctor is the offerer and sends the SDP offer once the patient accepts. The patient creates its peer before accepting, so the offer always has a target.
  - SDP and trickle ICE candidates go via `POST /calls/:id/signal` to the other participant's event stream. Signals for an ended call are dropped.
  - Signals are applied and sent in order; early ICE candidates are buffered until the remote description is set.
- **Cleanup:** `pagehide` sends `navigator.sendBeacon` to end owned calls. A tab that reconnects and finds a live call it has no media for ends it as `failed`.

## How the code is organised

**`api/src/`**
- `auth/`: login, JWT issuing, global `JwtAuthGuard` (every route unless `@Public()`) and `RolesGuard` (`@Roles(...)`).
- `data/`: abstract repositories (`users`, `patients`, `messages`, `calls`) that services depend on.
  - `prisma/`: Postgres implementations, `PrismaService` (Prisma client over `@prisma/adapter-pg`), row ↔ domain mappers. Provided by `DataModule`.
  - `memory/`: in-memory implementations over `mock-data.ts`, for tests (`MemoryDataModule`).
- `prisma/` (in `api/`): `schema.prisma`, SQL migrations, `seed.ts`. Config in `prisma.config.ts`.
- `patients/`: patient list/record, care team, and `resolveConversation` (who may access a conversation).
- `messages/`, `calls/`, `realtime/`: messaging, call lifecycle and signaling, SSE event bus.
- `common/`: shared types (`types.ts`, mirrored in `web/src/lib/types.ts`), auth decorators, password hashing.

**`web/src/`**
- `proxy.ts`: redirects signed-out users to the right login page for the doctor area (`/patients`) and the patient area (`/portal`).
- `lib/session.ts`: signed session cookies (one per role) that hold the user's API access token.
- `lib/dal.ts`: Data Access Layer for server components; checks the session, then calls the API.
- `lib/api/`: typed client for the API (`ClinicApi`, `ApiError`).
- `lib/bff.ts` + `app/api/`: route handlers that forward browser requests (messages, calls, signals, event stream) to the API.
- `components/realtime/`: `RealtimeProvider` (one `EventSource` per tab, event fan-out to subscribers).
- `components/calls/`: `CallProvider` (client call state, media capture, ringtone), `peer.ts` (`RTCPeerConnection` wrapper), `call-ui.tsx` (incoming, outgoing, in-call and ended views).
- `app/(doctor)/`: patient list and patient record (with chat and call buttons). `app/portal/`: patient login and portal.

## Roadmap

1. ~~Database: PostgreSQL with Prisma, in `api/`.~~ Done.
2. **Calls on Cloudflare RealtimeKit.**
   - Replaces peer-to-peer WebRTC with Cloudflare's managed SFU.
   - The API creates a meeting and a participant token per call; clients join with the RealtimeKit SDK.
   - Removes `peer.ts` and the `/signal` routes.
   - `CallsService` keeps call state: ringing, accept/decline/end and the call log.
3. Shared types package for `api/` and `web/` (replacing the mirrored `types.ts`).
4. Medication management.
5. Unread message indicators and notifications for doctors.

## Git workflow

- **`main` holds only an empty "Initial commit".** All work happens on feature branches and is merged into `main` with a pull request.
- **Branch names:** `feature/<what>`, e.g. `feature/web-portal-mvp`.
- **Commit messages** follow git convention:
  - Imperative mood ("Add messaging", not "Added messaging").
  - A short subject line under about 70 characters, then a blank line, then `-` bullet points.
  - Limitations go in a `Notes:` section.

  ```
  Add real-time messaging between patients and doctors

  - Add messages API and live event stream
  - Show conversation on the patient record and in the patient portal

  Notes:
  - Messages are kept in memory until the database is added
  ```
- **Commit migrations, not the generated client.** `api/prisma/migrations/` is committed; `api/src/generated/` is git-ignored.
- **Never commit secrets.** `web/.env.local` and `api/.env` are git-ignored; each app's `.env.example` lists the variables without values.

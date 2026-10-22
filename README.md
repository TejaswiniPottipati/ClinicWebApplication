# CWA Clinic

Demo clinic web application. The clinic has two doctors, a Physician and a Surgeon, each with 20 patients. Doctors view patient records, message patients and run audio/video consultations. Patients use a separate portal to message their doctor and answer calls.

| Folder | What | Status |
| --- | --- | --- |
| `web/` | Next.js 16 client (React 19, TypeScript, Tailwind) | Doctor portal, patient portal, messaging, audio/video calls |
| `api/` | NestJS API | Not started |

## Current status

**Done:**
- Separate sign-in pages and sessions for doctors (`/login`) and patients (`/portal/login`).
- Doctor dashboard: patient list with search and status filters, and a patient record view. Each doctor sees only their own patients.
- Real-time messaging between each patient and their doctor.
- Audio/video calls: the doctor calls, the patient can accept or decline, and either side can end the call. Every call is logged in the chat.

**Known limitations:**
- **Demo data in memory.** Patient data comes from a generated file (`web/src/lib/api/mock-data.ts`). Messages and calls are kept in server memory and **reset when the server restarts**.
- **Calls are peer-to-peer WebRTC with STUN only.** There's no TURN relay or SFU, so calls fail when the network blocks direct connectivity (symmetric NAT, strict firewalls).
- **No unread indicators.** A doctor only sees a patient's new messages when that patient's record is open.
- **Portal must be open for calls.** A patient only receives a call while the portal is open in their browser.

## Run the web app

Requirements: Node.js 20.19 or newer (22 LTS recommended).

```bash
cd web
cp .env.example .env.local   # then set SESSION_SECRET (openssl rand -base64 32)
npm install
npm run dev                  # http://localhost:3000
```

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

## Real-time architecture

- **Transport:** each signed-in tab opens one Server-Sent Events stream (`GET /api/realtime?role=doctor|patient`). Client actions are plain `POST`s to route handlers. The stream reconnects automatically; on reconnect the chat refetches history.
- **Hub:** `src/lib/realtime/hub.ts` holds conversations and call state in process memory (Node `EventEmitter`, one channel per user: `doctor:<id>`, `patient:<id>`).
- **Call state machine (server-authoritative):**
  - `ringing → active → ended`
  - End reasons: `completed`, `declined`, `missed` (30 s ring timeout), `cancelled` (caller hung up while ringing), `failed` (media error, or a participant disconnected for over 5 s).
  - One live call per doctor and per patient (`409` otherwise).
  - Each ended call is appended to the conversation as a call-log message.
- **WebRTC:**
  - Peer-to-peer `RTCPeerConnection`; STUN only (`stun.l.google.com`), no TURN, no SFU.
  - The doctor is the offerer and sends the SDP offer once the patient accepts. The patient creates its peer before accepting, so the offer always has a target.
  - SDP and trickle ICE candidates are relayed via `POST /api/calls/:id/signal` and the callee's SSE stream.
  - Signals are applied and sent in order; early ICE candidates are buffered until the remote description is set.
- **Cleanup:** `pagehide` sends `navigator.sendBeacon` to end owned calls. A tab that reconnects and finds a live call it has no media for ends it as `failed`.

## How `web/` is organised

- `src/proxy.ts`: redirects signed-out users to the right login page for the doctor area (`/patients`) and the patient area (`/portal`).
- `src/lib/dal.ts`: Data Access Layer. Every data read checks the session and role here.
- `src/lib/api/`: `ClinicApi` interface. It uses the demo data (`mock.ts`) unless `API_URL` is set, then calls the NestJS API (`http.ts`, which lists the endpoints the API must provide).
- `src/lib/realtime/hub.ts`: in-memory message store, call state machine and event fan-out. Single-process only.
- `src/lib/realtime/auth.ts`: resolves the acting role from its session cookie and authorizes the doctor–patient pair.
- `src/app/api/`: `realtime` (SSE), `messages` (`GET` history, `POST` send), `calls` (`POST` start), `calls/[id]` (`accept` / `decline` / `end`), `calls/[id]/signal` (SDP/ICE relay).
- `src/components/realtime/`: `RealtimeProvider` (one `EventSource` per tab, event fan-out to subscribers).
- `src/components/calls/`: `CallProvider` (client call state, media capture, ringtone), `peer.ts` (`RTCPeerConnection` wrapper), `call-ui.tsx` (incoming, outgoing, in-call and ended views).
- `src/app/(doctor)/`: patient list and patient record (with chat and call buttons).
- `src/app/portal/`: patient login and portal (doctor card and chat).

## Roadmap

1. **Database: PostgreSQL with Prisma.**
   - Postgres runs locally in Docker (a `docker-compose.yml` at the project root).
   - At first `web/` talks to it directly, through a database version of the `ClinicApi` interface. Pages don't change.
   - Tables: users (hashed passwords), doctors, patients, conditions, allergies, medications, visits, messages, calls.
   - The current demo data becomes a seed script.
   - Messages and call history survive restarts.
2. **Calls on Cloudflare RealtimeKit.**
   - Replaces peer-to-peer WebRTC with Cloudflare's managed SFU.
   - The server creates a meeting and a participant token per call; clients join with the RealtimeKit SDK.
   - Removes `peer.ts` and the `/signal` route.
   - The hub keeps call state: ringing, accept/decline/end and the call log.
3. **NestJS API (`api/`).** It takes over auth (JWT), patient data, the database and real-time events (WebSocket gateway). `web/` then talks to the API instead of the database.
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
- **Never commit secrets.** `web/.env.local` is git-ignored; `web/.env.example` lists the variables without values.

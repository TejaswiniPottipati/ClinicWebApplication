# CWA Clinic

Demo clinic app: two doctors (Physician, Surgeon), 20 patients each. Doctors view patient records, manage medications, message patients and run audio/video consultations.

| Folder | What | Status |
| --- | --- | --- |
| `web/` | Next.js 16 client (React 19, TypeScript, Tailwind) | Doctor portal, patient portal, messaging, audio/video calls |
| `api/` | NestJS API | Not started |

## Run the web app

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
| Patient | `/portal/login` | `aarav.johnson@mail.test` (Dr. Rao's), `aarav.chen@mail.test` (Dr. Okafor's); every patient's email is on their record |

### Try messaging and calls

Doctors and patients have separate session cookies, so both can be signed in in one browser:

1. Tab 1: sign in as `physician@clinic.test` and open patient **P-1001**.
2. Tab 2: sign in to the patient portal as `aarav.johnson@mail.test`.
3. Send messages either way; they appear instantly.
4. From the doctor tab click **Video call** or **Audio call**. The patient tab rings: Accept, Decline, then mute, camera and End.

Calls need microphone (and camera) permission and work on `localhost` or https.

## How `web/` is organised

- `src/proxy.ts`: optimistic redirects for the doctor area (`/patients`) and patient area (`/portal`).
- `src/lib/dal.ts`: Data Access Layer. Every data read checks the session and role here.
- `src/lib/api/`: `ClinicApi` interface. Uses in-memory demo data (`mock.ts`) unless `API_URL` is set, then calls the NestJS API (`http.ts`, which documents the endpoints the API must provide).
- `src/lib/realtime/hub.ts`: in-memory messaging and call state. It's a stand-in for a NestJS WebSocket gateway. Data resets on server restart and it runs on a single server process.
- `src/app/api/`: `realtime` (Server-Sent Events stream), `messages`, `calls` (start, accept, decline, end, WebRTC signaling).
- `src/components/calls/`: call state machine, WebRTC peer and call UI. Media flows browser to browser; the server only relays signaling.
- `src/app/(doctor)/`: patient list and patient record (with chat and call buttons).
- `src/app/portal/`: patient login and portal (doctor card and chat).

## Roadmap

1. NestJS API: auth (JWT), patients, messages (persisted), WebSocket gateway for realtime + call signaling
2. TURN server so calls connect across restrictive networks
3. Medication management
4. Unread message indicators and notifications for doctors

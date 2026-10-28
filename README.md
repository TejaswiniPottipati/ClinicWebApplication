# CWA Clinic

A demo clinic web app. Two doctors (a Physician and a Surgeon) each have 20 patients. Doctors view patient records, prescribe medication, message patients and hold audio/video calls. Patients use their own portal to see their medications, message their doctor and answer calls.

## Features

- Separate sign-in for doctors and patients; each doctor sees only their own patients.
- Patient records: demographics, lab results, imaging reports, visits and medication history.
- Prescribing: add and discontinue prescriptions; patients see changes in their portal straight away.
- Real-time messaging between each patient and their doctor.
- Audio/video calls, with an optional Cloudflare TURN relay for strict networks.

## Tech stack

| | |
| --- | --- |
| `web/` | Next.js 16, React 19, TypeScript, Tailwind |
| `api/` | NestJS 12, Prisma 7, PostgreSQL 17 |
| Real-time | Server-Sent Events (messages, call events), WebRTC (audio/video) |
| Deployment | Vercel (web), Render (API), Neon (database), GitHub Actions (CI) |

```
browser ──(session cookie)──► web ──(Bearer JWT)──► api ──► PostgreSQL
```

The browser only talks to `web/`; its server code calls the API with the user's token.

## Run locally

Requires Node.js 22 and Docker.

```bash
# API (terminal 1)
cd api
cp .env.example .env        # set JWT_SECRET: openssl rand -base64 48
npm install
npm run db:up               # Postgres in Docker
npm run db:deploy           # create tables
npm run db:seed             # load demo data
npm run start:dev           # http://localhost:4000

# Web (terminal 2)
cd web
cp .env.example .env.local  # set SESSION_SECRET: openssl rand -base64 32
npm install
npm run dev                 # http://localhost:3000
```

## Demo accounts

Password for all: `Password123!`. All data is fictional.

| Portal | URL | Accounts |
| --- | --- | --- |
| Doctor | `/login` | `physician@clinic.test`, `surgeon@clinic.test` |
| Patient | `/portal/login` | `aarav.johnson@mail.test` (Dr. Rao's patient) |

To try messaging and calls, sign in as the physician in one window and open patient **P-1001**, then sign in as `aarav.johnson@mail.test` in another. Calls need microphone/camera permission.

## Tests

```bash
cd api
npm test            # unit tests
npm run test:e2e    # end-to-end tests (no database needed)
```

CI runs these plus lint, type checks, migrations and builds on every pull request.

## Deployment

Pushing to `main` runs CI, then deploys the web app to Vercel and the API to Render (database on Neon). Setup steps: [docs/deployment.md](docs/deployment.md).

## More documentation

- [Architecture](docs/architecture.md): key decisions, authentication, API routes, database, real-time and calls.
- [Development](docs/development.md): database commands, TURN setup, tests, git workflow.
- [Deployment](docs/deployment.md): Vercel, Render and Neon setup, environment variables.

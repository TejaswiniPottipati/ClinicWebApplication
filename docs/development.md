# Development

## Database commands (in `api/`)

| Command | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | Start / stop Postgres in Docker. Data stays in the `postgres-data` volume. |
| `npm run db:migrate -- --name <change>` | After editing `prisma/schema.prisma`: create and apply a migration. Commit it. |
| `npm run db:deploy` | Apply pending migrations (CI, production). |
| `npm run db:seed` | Load the demo data. Safe to re-run; keeps messages and added prescriptions. |
| `npm run db:reset` | Drop everything and re-apply migrations, then run `db:seed`. |
| `npm run db:studio` | Browse the tables in Prisma Studio. |

If `npm install` in `api/` fails with `Cannot read properties of null (reading 'edgesOut')`, use `npx npm@11 install` (npm 10 bug).

## Calls and TURN

Calls connect directly between browsers when the networks allow it. When they don't (mobile carrier NAT, hospital or office firewalls), media goes through a TURN relay. This is optional; without it, calls use STUN only.

1. Cloudflare dashboard → **Realtime → TURN Server** → create a key (free up to 1,000 GB/month).
2. Put both values in `api/.env` (never commit them):
   ```
   CLOUDFLARE_TURN_KEY_ID=...
   CLOUDFLARE_TURN_API_TOKEN=...
   ```
3. Restart the API. It logs `Calls use Cloudflare TURN.`

Other settings:
- `STUN_URLS` (`api/.env`, optional): comma-separated STUN servers. Default `stun:stun.cloudflare.com:3478`.
- `NEXT_PUBLIC_FORCE_TURN_RELAY=true` (`web/.env.local`, testing only): calls connect only through TURN, which proves the relay works.

## Tests

```bash
cd api
npm test           # unit: call timers and concurrency, TURN credentials
npm run test:e2e   # end-to-end over HTTP + SSE: auth, access rules, messaging, calls, validation
```

CI (`.github/workflows/ci.yml`) also runs lint, type checks, migrations and seed against a fresh Postgres, and builds both apps.

## Git workflow

- `main` is production: every push deploys. Work on `feature/<what>` branches and merge with a pull request once CI passes.
- Commit messages: imperative subject under ~70 characters, blank line, `-` bullet points.
- Commit migrations (`api/prisma/migrations/`), not the generated client (`api/src/generated/`).
- Never commit secrets: `api/.env` and `web/.env.local` are git-ignored; `.env.example` files list the variables.

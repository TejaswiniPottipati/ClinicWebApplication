# CWA Clinic API

NestJS 12 API for the CWA Clinic app: authentication, patients, messaging, calls and real-time events. Data lives in PostgreSQL (Prisma 7), behind repositories in `src/data/`; tests use in-memory mock data.

See the [root README](../README.md) for the route table, architecture and how `web/` uses this API.

```bash
cp .env.example .env    # set JWT_SECRET (openssl rand -base64 48)
npm install             # or: npx npm@11 install (works around an npm 10 bug)
npm run db:up           # Postgres in Docker (../docker-compose.yml)
npm run db:deploy       # apply migrations
npm run db:seed         # demo data
npm run start:dev       # http://localhost:4000, watch mode
npm test                # unit tests
npm run test:e2e        # end-to-end tests over HTTP + SSE (in-memory, no database)
npm run lint            # oxlint
npm run build && npm run start:prod
```

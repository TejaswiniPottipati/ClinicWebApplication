# CWA Clinic API

NestJS 12 API for the CWA Clinic app: authentication, patients, messaging, calls and real-time events. Data is mock, in memory, behind repositories in `src/data/`.

See the [root README](../README.md) for the route table, architecture and how `web/` uses this API.

```bash
cp .env.example .env    # set JWT_SECRET (openssl rand -base64 48)
npm install             # or: npx npm@11 install (works around an npm 10 bug)
npm run start:dev       # http://localhost:4000, watch mode
npm test                # unit tests
npm run test:e2e        # end-to-end tests over HTTP + SSE
npm run lint            # oxlint
npm run build && npm run start:prod
```

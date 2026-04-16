# partner-scheduling-api-demo

> **Demo/integration sample code only, not production reference. Do not use real patient data.**

A reference implementation demonstrating how a partner can integrate with Rula's Partner Scheduling API to search for providers, retrieve available slots, and book appointments.

---

## What this demos

This monorepo shows a complete end-to-end integration with the [Rula Partner Scheduling API](openapi/partner-scheduling.yaml):

1. **Auth0 authentication** — SPA login flow via `@auth0/auth0-react`
2. **Provider search** — search by state and insurance carrier
3. **Slot availability** — retrieve open appointment slots for a provider
4. **Appointment booking** — create a patient record and book an appointment
5. **Mock mode** — all above works without a live partner API connection (`USE_MOCK_API=true`)

---

## Architecture

```
partner-scheduling-api-demo/
├── apps/
│   ├── web/          React 19 + Vite + Auth0 SPA (port 3000)
│   └── api/          Fastify proxy / mock server (port 4000)
├── packages/
│   ├── api-client/   Generated OpenAPI client types
│   └── shared/       Shared TypeScript types
├── openapi/
│   └── partner-scheduling.yaml   Partner API spec (v0.23.2)
├── mocks/            JSON fixture files for mock mode
└── docs/
```

```
Browser (port 3000)
    │  Auth0 login
    ▼
apps/web  ──── /api/* proxy ────►  apps/api (port 4000)
                                        │
                              USE_MOCK_API=true?
                             ┌────────────┴────────────┐
                             │ yes                      │ no
                             ▼                          ▼
                         mocks/*.json        PARTNER_API_BASE_URL
                                               + Auth0 M2M token
```

---

## Environment variables

### Root `.env` (consumed by `apps/api`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PARTNER_API_BASE_URL` | When `USE_MOCK_API=false` | — | Live partner API base URL |
| `AUTH0_TOKEN_URL` | When `USE_MOCK_API=false` | — | Auth0 `/oauth/token` endpoint for M2M tokens |
| `PARTNER_API_CLIENT_ID` | When `USE_MOCK_API=false` | — | OAuth2 client ID for M2M |
| `PARTNER_API_CLIENT_SECRET` | When `USE_MOCK_API=false` | — | OAuth2 client secret for M2M |
| `USE_MOCK_API` | No | `true` | When `true`, serve fixture data from `mocks/` |
| `APP_BASE_URL` | No | `http://localhost:3000` | Used for CORS |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | No | `info` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

### `apps/web/.env` (consumed by Vite)

| Variable | Required | Description |
|---|---|---|
| `VITE_AUTH0_ISSUER_DOMAIN` | Yes | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Yes | Auth0 SPA application client ID |
| `VITE_AUTH0_AUDIENCE_URL` | Yes | Auth0 API audience URL |
| `VITE_API_BASE_URL` | No | URL of `apps/api` (default: `http://localhost:4000`) |

---

## Local setup

**Prerequisites**: Node.js ≥ 20, pnpm ≥ 10

```bash
# 1. Clone
git clone https://github.com/pathccm/partner-scheduling-api-demo.git
cd partner-scheduling-api-demo

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
cp apps/web/.env.example apps/web/.env
# Edit .env and apps/web/.env — see table above

# 4. Start both apps (in separate terminals, or use turbo)
pnpm dev
# — apps/api starts on http://localhost:4000
# — apps/web starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Mock vs live mode

### Mock mode (default, `USE_MOCK_API=true`)

- No live partner API required
- `apps/api` reads fixture data from `mocks/*.json`
- Auth0 SPA login still works (you need a real Auth0 SPA app configured)
- Good for UI development and demos without partner API access

### Live mode (`USE_MOCK_API=false`)

- Requires all four `PARTNER_API_*` env vars
- `apps/api` fetches an Auth0 M2M token and proxies requests to `PARTNER_API_BASE_URL`
- Bearer token cached and refreshed automatically

---

## Deployment

This demo is not intended for production deployment. For a quick cloud demo:

1. **`apps/api`** — deploy as a Node.js service (Railway, Render, Fly.io). Set env vars. `USE_MOCK_API=true` for a standalone demo.
2. **`apps/web`** — static build: `pnpm --filter @partner-scheduling-demo/web build`. Deploy `apps/web/dist/` to any static host (Vercel, Netlify, S3+CloudFront).
3. Set `APP_BASE_URL` in `apps/api` to the web app's URL for CORS.
4. Set `VITE_API_BASE_URL` in `apps/web/.env` to the deployed API URL before building.

---

## Demo script

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Log In with Auth0** and complete the Auth0 login flow
3. Select a state (e.g., **CA**) and optionally filter by insurance
4. Click **Search Providers** — three mock providers appear
5. Click **View Slots** on any provider — six upcoming slots appear
6. Select a slot — enter patient details (use fake data, this is a demo)
7. Click **Confirm Appointment** — booking confirmation with ID appears

---

## Known limitations

- This is a demo, not a production-ready application
- Auth0 SPA application must be configured separately (not included)
- Mock data in `mocks/` uses hardcoded provider UUIDs and future-dated slots
- No session persistence — state resets on page refresh
- No error retry logic
- CORS is permissive in dev mode

---

## OpenAPI spec and typed client

> Tested against partner-scheduling-api spec **v0.23.2**

The committed spec is at [`openapi/partner-scheduling.yaml`](openapi/partner-scheduling.yaml).
All proxy route request/response types are generated from it — no manual `any` casts.

View it interactively: paste the file contents into [editor.swagger.io](https://editor.swagger.io) or [redocly.com/redoc](https://redocly.com/redoc/).

### Updating the spec

Replace `openapi/partner-scheduling.yaml` with the new spec, then:

1. Run `pnpm generate:client` — regenerates `packages/api-client/src/generated.ts`
2. Fix any TypeScript errors surfaced by the new types
3. Update the version note above and commit both files

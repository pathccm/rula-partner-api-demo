# partner-scheduling-api-demo

> **Demo/integration sample code only, not production reference. Do not use real patient data.**

A reference implementation showing how a partner can integrate with Rula's Partner Scheduling API to search for providers, retrieve available slots, and book appointments.

---

## What this demos

This monorepo shows a complete end-to-end integration with the [Rula Partner Scheduling API](openapi/partner-scheduling.yaml):

1. **Provider search** — filter by state, insurance carrier, care type, and session format
2. **Provider profiles** — view bio, approach, focus areas, accepted insurance, and more
3. **Slot availability** — retrieve open appointment slots for a provider
4. **Appointment booking** — create a patient record and book an appointment
5. **Partial mock mode** — read endpoints (insurances, providers, slots) always hit the real partner API; write endpoints (patient creation, booking) are mocked via `USE_MOCK_API=true`

---

## Architecture

```
partner-scheduling-api-demo/
├── apps/
│   ├── web/          React 19 + Vite SPA (port 3000 in dev)
│   └── api/          Fastify BFF / proxy server (port 4004)
├── packages/
│   ├── api-client/   Generated OpenAPI client types
│   └── shared/       Shared TypeScript types
├── openapi/
│   └── partner-scheduling.yaml   Partner API spec (v0.23.2)
├── mocks/            JSON fixtures for mocked write endpoints
└── docs/
```

```
Browser (port 3000)
    │
    ▼
apps/web  ──── /v1/* proxy ────►  apps/api (port 4004)
                                        │
                              ┌─────────┴─────────┐
                              │ reads              │ writes
                              ▼                    ▼
                     PARTNER_API_BASE_URL   USE_MOCK_API=true?
                      + Auth0 M2M token     mocks/ or live API
```

In production, `apps/api` serves `apps/web/dist/` as static files — both apps run on the same origin.

---

## Environment variables

### `apps/api/.env`

Copy `apps/api/.env.example` and fill in the values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PARTNER_API_BASE_URL` | Yes | — | Live partner API base URL |
| `PARTNER_API_AUDIENCE` | Yes | — | OAuth2 audience for the partner API |
| `AUTH0_TOKEN_URL` | Yes | — | Auth0 `/oauth/token` endpoint for M2M tokens |
| `PARTNER_API_CLIENT_ID` | Yes | — | OAuth2 client ID |
| `PARTNER_API_CLIENT_SECRET` | Yes | — | OAuth2 client secret |
| `USE_MOCK_API` | No | `true` | When `true`, mocks patient creation and booking |
| `APP_BASE_URL` | No | `http://localhost:3000` | Allowed CORS origin |
| `PORT` | No | `4004` | API server port |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | No | `info` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

### `apps/web/.env`

Copy `apps/web/.env.example`. Only needed when running the Vite dev server separately.

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | URL of `apps/api`. Defaults to `http://localhost:4004` via the Vite proxy. Omit when the frontend is served by the API. |

---

## Local setup

**Prerequisites**: Node.js ≥ 20, pnpm ≥ 10

```bash
# 1. Clone
git clone https://github.com/pathccm/partner-scheduling-api-demo.git
cd partner-scheduling-api-demo

# 2. Install all workspace dependencies
pnpm install

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
# Fill in PARTNER_API_BASE_URL, PARTNER_API_AUDIENCE, AUTH0_TOKEN_URL,
# PARTNER_API_CLIENT_ID, PARTNER_API_CLIENT_SECRET

# 4. Start both apps
pnpm dev
# — apps/api starts on http://localhost:4004
# — apps/web starts on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Mock vs live mode

Read endpoints (`GET /v1/insurances`, `POST /v1/providers/search`, `GET /v1/providers/slots`, `GET /v1/providers/:uuid`) always call the real partner API and always require valid credentials.

Write endpoints (`POST /v1/patients`, `POST /v1/appointments`) are controlled by `USE_MOCK_API`:

| `USE_MOCK_API` | Patient creation | Appointment booking |
|---|---|---|
| `true` (default) | Returns a mock patient ID | Returns a mock appointment after a 2s delay |
| `false` | Calls live partner API | Calls live partner API |

---

## Deployment

For a quick cloud demo:

1. **`apps/api`** — deploy as a Node.js service (Railway, Render, Fly.io). Set all env vars. The API will serve the built frontend from `apps/web/dist/`.
2. Build the frontend: `pnpm --filter @partner-scheduling-demo/web build`
3. The built `apps/web/dist/` is served automatically by the API at the same origin — no separate frontend deployment needed.
4. Set `APP_BASE_URL` in `apps/api` to the deployed service URL.

---

## Demo walkthrough

1. Open [http://localhost:3000](http://localhost:3000)
2. Select a **care type** (Individual, Couples, Family, or Psychiatry), **session format** (Video or In person), and **state**
3. Select your **insurance** plan (or pay out of pocket)
4. Browse **providers** — click **About** to view a full profile, **View slots** to continue
5. Select an **appointment slot**
6. Enter **patient information** and click **Confirm appointment**
7. View the **booking confirmation** and appointment status

---

## Known limitations

- Demo only — not production-ready
- No session persistence — state resets on page refresh
- Mock patient/appointment data uses generated IDs and will not appear in the live partner system

---

## OpenAPI spec and typed client

> Tested against partner-scheduling-api spec **v0.23.2**

The committed spec is at [`openapi/partner-scheduling.yaml`](openapi/partner-scheduling.yaml).
All proxy route request/response types are generated from it — no manual `any` casts.

View it interactively: paste the file into [editor.swagger.io](https://editor.swagger.io) or [redocly.com/redoc](https://redocly.com/redoc/).

### Updating the spec

Replace `openapi/partner-scheduling.yaml` with the new spec, then:

1. Run `pnpm generate:client` — regenerates `packages/api-client/src/generated.ts`
2. Fix any TypeScript errors surfaced by the new types
3. Update the version note above and commit both files

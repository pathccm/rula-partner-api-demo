# rula-partner-api-demo

> **Demo/integration sample code only, not production reference. Do not use real patient data.**

A reference implementation showing how a partner can integrate with Rula's Partner Scheduling API to search for providers, retrieve available slots, and book appointments.

---

## Legal & Security

### Non-Production Status

The prototypes, demos, and sample code in this repository are for **illustrative purposes only**. They are not intended for use in production environments without significant independent testing and security review.

### No PHI/PII

This repository does **not contain Protected Health Information (PHI) or Personally Identifiable Information (PII)**. All demo data is synthetic. You are **strictly prohibited** from uploading or testing any real patient data against these public resources.

### No Warranty

Rula provides these materials on an **"as-is" basis** with no guarantees regarding accuracy, completeness, or availability. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

### API Evolution

The OpenAPI specifications are subject to change. Rula reserves the right to modify or deprecate endpoints per the Partner Agreement. This repository may not reflect the latest production API.

### Not a Contract

Use of this repository does not constitute a formal partnership or SLA. Access to production APIs requires a signed agreement and credentials issued by Rula.

### Support

For production support, contact your Rula Partner Manager. **Do not open GitHub Issues for production API support.** For security vulnerabilities, see [SECURITY.md](SECURITY.md).

### Trademark

The Rula name and logo are trademarks of Rula Health, Inc. and are not licensed under the Apache 2.0 license that governs this code. Do not create repositories or applications that imply official Rula affiliation without written permission.

The demo runs fully without credentials using built-in fixture data. To test against the live API, see [Getting credentials](#getting-credentials).

---

## What this demos

1. **Provider search** - filter by state, insurance carrier, care type, and session format
2. **Provider profiles** - view bio, approach, focus areas, accepted insurance, and more
3. **Slot availability** - retrieve open appointment slots for a provider
4. **Appointment booking** - create a patient record and book an appointment

---

## Local setup

**Prerequisites**: Node.js ≥ 20, pnpm ≥ 10

```bash
git clone https://github.com/pathccm/rula-partner-api-demo.git
cd rula-partner-api-demo
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials needed — all data is mocked by default.

To use the live partner API, copy `apps/api/.env.example` to `apps/api/.env`, fill in your credentials, then run `pnpm dev`.

---

## Documentation

The full Partner API user guide is available at [`docs/UserGuide-RulaPartnerAPI.md`](docs/UserGuide-RulaPartnerAPI.md).

---

## Getting credentials

Contact your Rula partner representative or email [epd-partnerships-deals-eng@rula.com](mailto:epd-partnerships-deals-eng@rula.com) to request OAuth2 credentials (`PARTNER_API_CLIENT_ID`, `PARTNER_API_CLIENT_SECRET`, `PARTNER_API_BASE_URL`, `PARTNER_API_AUDIENCE`, `AUTH0_TOKEN_URL`).

---

## Mock vs live mode

- `USE_MOCK_API=true` (default) — all endpoints return fixture data from `mocks/`, no credentials needed
- `USE_MOCK_API=false`, credentials present — read and write endpoints call the live partner API
- `USE_MOCK_API=false`, no credentials — all endpoints fall back to fixture data
- `USE_MOCK_API=false`, state `MB` — write endpoints call the live partner API (MB is Rula's test state); other states still mock

---

## Environment variables

All variables are optional. Omitting credentials runs the demo in full mock mode.

| Variable | Default | Description |
|---|---|---|
| `PARTNER_API_BASE_URL` | - | Live partner API base URL |
| `PARTNER_API_AUDIENCE` | - | OAuth2 audience |
| `AUTH0_TOKEN_URL` | - | Auth0 `/oauth/token` endpoint |
| `PARTNER_API_CLIENT_ID` | - | OAuth2 client ID |
| `PARTNER_API_CLIENT_SECRET` | - | OAuth2 client secret |
| `USE_MOCK_API` | `true` | When `true`, all endpoints return fixture data regardless of credentials |
| `APP_BASE_URL` | `http://localhost:3000` | Allowed CORS origin |
| `API_KEY` | - | When set, requires `x-api-key` header on all `/v1/*` requests |
| `PORT` | `4004` | API server port |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `info` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

`apps/web` has one optional variable: `VITE_API_BASE_URL` (defaults to `http://localhost:4004` via the Vite proxy; only needed when running the frontend separately).

---

## Deployment

**Prerequisites**: [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed and logged in.

```bash
# Create app
heroku create your-app-name

# Set env vars (from local .env, or skip for full mock mode)
heroku config:set $(grep -v '^#' apps/api/.env | grep -v '^$' | xargs) \
  APP_BASE_URL=https://your-app-name.herokuapp.com \
  NODE_ENV=production \
  -a your-app-name

# Deploy
git push heroku main
```

`apps/api` serves the built `apps/web/dist/` as static files - no separate frontend deployment needed. Health check: `GET /health`.

---

## Demo walkthrough

1. Select a **care type**, **session format**, and **state**
2. Select your **insurance** plan (or pay out of pocket)
3. Browse **providers** - click **About** to view a full profile, **View slots** to continue
4. Select an **appointment slot**
5. Enter **patient information** and click **Confirm appointment**
6. View the **booking confirmation** and appointment status

---

## Known limitations

- Demo only - not production-ready
- No session persistence - state resets on page refresh
- Mock data uses generated IDs and will not appear in the live partner system

---

## OpenAPI spec and typed client

> Tested against partner-scheduling-api spec **v0.24.0**

The committed spec is at [`openapi/openapi.yaml`](openapi/openapi.yaml). All proxy route request/response types are generated from it - no manual `any` casts.

View it interactively: paste the file into [editor.swagger.io](https://editor.swagger.io) or [redocly.com/redoc](https://redocly.com/redoc/).

### Updating the spec

Replace `openapi/openapi.yaml` with the new spec, then:

1. Run `pnpm generate:client` - regenerates `packages/api-client/src/generated.ts`
2. Fix any TypeScript errors surfaced by the new types
3. Update the version note above and commit both files

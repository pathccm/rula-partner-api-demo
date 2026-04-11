# Jira: DEA-1261 - Set up monorepo

**Status**: completed
**Assignee**: Justin Choi
**Epic**: N/A (Sub-task)
**Priority**: Not specified
**Issue Type**: Sub-task
**Jira Link**: https://rula.atlassian.net/browse/DEA-1261

## Summary

Initialize the repo structure. This is the foundation everything else builds on.

Example structure:

```
partner-scheduling-api-demo/
  apps/
    web/        # frontend
    api/        # backend proxy
  packages/
    api-client/ # generated OpenAPI client
    shared/     # shared types
  openapi/
    partner-scheduling.yaml   # pinned at v0.16.0
  mocks/
  docs/
  .env.example
  README.md
```

## Acceptance Criteria

- [ ] Monorepo tooling configured (pnpm workspaces or Turborepo)
- [ ] Linting + formatting enforced in CI
- [ ] .gitignore covers all `.env*` files
- [ ] Secret scanning in CI (e.g. trufflehog or gitleaks)
- [ ] .env.example documents all required vars (no real values)
- [ ] README includes: what the app demos, architecture diagram, env var table, local setup, mock vs live mode, deployment guide, demo script, known limitations, link to OpenAPI docs
- [ ] Disclaimer in README: "Demo/integration sample code only, not production reference. Do not use real patient data."
- [ ] License file present

Required env vars:
```
PARTNER_API_BASE_URL=
AUTH0_TOKEN_URL=
PARTNER_API_CLIENT_ID=
PARTNER_API_CLIENT_SECRET=
USE_MOCK_API=true
APP_BASE_URL=
NODE_ENV=
LOG_LEVEL=
```

## Related Issues

- Parent project: DEA (Partnerships Deals)

## Additional Context

- Reference `~/rula-projects/frontend-repo-template` for frontend patterns and conventions

## Functional Requirements (EARS)

### Category 1: Monorepo Tooling

1. WHEN the repo is cloned THEN the system SHALL support `pnpm install` at root to install all workspace dependencies
2. WHERE pnpm workspaces are configured THEN the system SHALL resolve inter-package dependencies via workspace protocol (`workspace:*`)
3. WHEN a developer runs build/lint/test tasks THEN the system SHALL support task orchestration (Turborepo or pnpm `--filter`)
4. IF Turborepo is chosen THEN the system SHALL define a `turbo.json` with pipeline for `build`, `lint`, `test`, and `dev` tasks

### Category 2: CI / Linting / Formatting

5. WHEN a PR is opened or pushed THEN the system SHALL run linting and formatting checks in CI
6. WHERE Biome is the configured linter/formatter THEN the system SHALL fail CI if any lint or format violations exist
7. WHEN a commit is pushed THEN the system SHALL run secret scanning (trufflehog or gitleaks) and fail CI on detected secrets

### Category 3: Environment Variable Safety

8. WHEN the `.gitignore` is applied THEN the system SHALL exclude all `.env*` files from version control
9. WHERE `.env.example` exists THEN the system SHALL document all required variables with placeholder values (no real secrets)
10. IF `USE_MOCK_API=true` THEN the system SHALL route API calls to mock handlers instead of live partner endpoints

### Category 4: README & Documentation

11. WHERE the README exists THEN the system SHALL include: app purpose, architecture diagram, env var table, local setup steps, mock vs live mode explanation, deployment guide, demo script, known limitations, and link to OpenAPI docs
12. WHERE the README exists THEN the system SHALL include the disclaimer: "Demo/integration sample code only, not production reference. Do not use real patient data."

### Category 5: Licensing

13. WHERE the repo is published THEN the system SHALL include a LICENSE file appropriate for a demo/sample repository

## Derived Test Cases

- [ ] **Workspace install**: `pnpm install` at root resolves all packages without errors
- [ ] **Inter-package resolution**: `packages/shared` can be imported in `apps/api` and `apps/web` via workspace alias
- [ ] **Lint CI check**: Introducing a lint violation causes CI to fail
- [ ] **Format CI check**: Introducing a formatting violation causes CI to fail
- [ ] **Secret scan**: Committing a test secret pattern triggers secret scanning failure in CI
- [ ] **gitignore coverage**: `.env`, `.env.local`, `.env.production` are not tracked by git
- [ ] **env.example completeness**: All 8 required vars appear in `.env.example` with no real values
- [ ] **Mock mode**: With `USE_MOCK_API=true`, API layer returns mock responses without hitting live partner API
- [ ] **README content**: README contains all required sections listed in AC
- [ ] **License**: LICENSE file exists at repo root

## Implementation Plan

### Decision: Start fresh with a clean public repo (2026-04-10)

The original repo was built from an internal production service template and is not safe to publish publicly. It contains a committed internal CA cert, private `@pathccm/*` packages that external users can't install, internal CI workflows, Kafka/DynamoDB/EKS/Harness infrastructure configs, and references to internal Confluence/PagerDuty/Datadog.

**The repo will be deleted and rebuilt from scratch.** All work below applies to the new repo.

### New repo structure
```
partner-scheduling-api-demo/
  apps/
    web/        # React 19 + Vite + TypeScript + Auth0
    api/        # Simple Fastify proxy (pino logging, no @pathccm/* packages)
  packages/
    api-client/ # Generated OpenAPI client
    shared/     # Shared types
  openapi/
    partner-scheduling.yaml  # Pinned at v0.16.0
  mocks/        # Mock response fixtures
  docs/
  .env.example
  README.md
  LICENSE
```

### Constraints
- No `@pathccm/*` packages
- No internal CA certs, secrets files, Datadog/PagerDuty/Harness config
- CI uses public GitHub Actions only
- Mock mode on by default (`USE_MOCK_API=true`) — no DynamoDB, no Kafka

### Implementation Steps (pending repo recreation)

#### Phase 1: Repo scaffold
- [x] Create new public repo `pathccm/partner-scheduling-api-demo`
- [x] Set up pnpm workspaces (`apps/*`, `packages/*`)
- [x] Root `package.json`, `biome.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `turbo.json`

#### Phase 2: `apps/web/`
- [x] React 19 + Vite + TypeScript + Auth0 (same frontend tech stack as `frontend-repo-template`)
- [x] Zod config validation for `VITE_*` env vars
- [x] `apps/web/.env.example` with just VITE_ vars
- [x] SchedulingPage — provider search, slots, patient form, confirmation

#### Phase 3: `apps/api/`
- [x] Fastify + @fastify/cors + pino logging
- [x] In-memory mock store via JSON fixtures
- [x] `USE_MOCK_API` flag — when true, serve from `mocks/`; when false, proxy to `PARTNER_API_BASE_URL`
- [x] Auth0 M2M token service (cached, auto-refreshed)
- [x] Routes: `/v1/insurances`, `/v1/providers/search`, `/v1/providers/slots`, `/v1/providers/:uuid`, `/v1/patients`, `/v1/appointments`

#### Phase 4: `mocks/`
- [x] `providers.json` — 3 mock providers (CA, therapy/psychiatry)
- [x] `slots.json` — 6 mock slots (telemedicine + in_person)
- [x] `insurances.json` — 7 mock carriers

#### Phase 5: `openapi/`
- [x] Added `partner-scheduling.yaml` — used v0.23.2 (v0.16.0 not found in git history)
- [x] `packages/api-client` — placeholder for generated OpenAPI client types

#### Phase 6: CI
- [x] `linting.yml` — pnpm install, biome ci, turbo typecheck + test
- [x] `secret-scan.yml` — TruffleHog OSS action
- [x] `openapi-breaking-changes.yml` — oasdiff action (triggers on `openapi/**` changes)

#### Phase 7: Docs
- [x] `README.md` — purpose, architecture diagram, env var table, local setup, mock/live mode, deployment guide, demo script, known limitations, OpenAPI link, disclaimer
- [x] `LICENSE` — MIT (was already present)

## Notes

- Plan created: 2026-04-10
- Branch: DEA-1261
- Command: /jira-start DEA-1261
- Additional context: Reference `~/rula-projects/frontend-repo-template` for frontend patterns
- 2026-04-10: Blocked — original repo not safe for public release; pending deletion and recreation
- 2026-04-10: Unblocked — repo recreated from scratch; all phases implemented
- Note: v0.16.0 of partner-scheduling.yaml not found in git history; used v0.23.2 from docs/openapi.yaml

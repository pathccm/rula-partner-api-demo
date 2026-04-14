import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = {
    USE_MOCK_API: true,
    AUTH0_ISSUER_DOMAIN: undefined as string | undefined,
    AUTH0_AUDIENCE_URL: undefined as string | undefined,
    AUTH0_TOKEN_URL: undefined as string | undefined,
    PARTNER_API_BASE_URL: undefined as string | undefined,
    PARTNER_API_CLIENT_ID: undefined as string | undefined,
    PARTNER_API_CLIENT_SECRET: undefined as string | undefined,
    PARTNER_API_TIMEOUT_MS: 10_000,
    APP_BASE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'info' as const,
    NODE_ENV: 'test' as const,
    PORT: 4000,
  }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig }))

// Auth plugin is a no-op in all route tests; verifyJwt is tested separately
vi.mock('../plugins/auth.js', () => ({
  authPlugin: vi.fn().mockResolvedValue(undefined),
  verifyJwt: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  mockConfig.USE_MOCK_API = true
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', mockMode: true })
    await app.close()
  })
})

describe('proxy routes in mock mode', () => {
  it('GET /v1/insurances returns mock insurances', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/v1/insurances' })
    expect(res.statusCode).toBe(200)
    const body = res.json<Array<{ name: string }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toHaveProperty('name')
    await app.close()
  })

  it('POST /v1/providers/search returns mock providers', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/providers/search',
      payload: { state: 'CA' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<Array<{ uuid: string }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('uuid')
    await app.close()
  })

  it('GET /v1/providers/slots returns slots for provider', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/providers/slots?provider_uuid=provider-001-mock&two_letter_state=CA',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<Array<{ start_time: string }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('start_time')
    await app.close()
  })

  it('POST /v1/patients returns created patient', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/patients',
      payload: { first_name: 'Demo', last_name: 'User', email: 'demo@example.com' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ uuid: string; first_name: string }>()
    expect(body).toHaveProperty('uuid')
    expect(body.first_name).toBe('Demo')
    await app.close()
  })

  it('POST /v1/appointments returns created appointment', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/appointments',
      payload: {
        provider_uuid: 'provider-001-mock',
        patient_uuid: 'patient-001-mock',
        start_time: '2030-06-02T09:00:00-07:00',
        end_time: '2030-06-02T10:00:00-07:00',
        appointment_type: 'telemedicine',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ uuid: string; status: string }>()
    expect(body).toHaveProperty('uuid')
    expect(body.status).toBe('confirmed')
    await app.close()
  })
})

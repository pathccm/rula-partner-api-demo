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
    const body = res.json<{ slots: Array<{ start_time_iso: string }> }>()
    expect(Array.isArray(body.slots)).toBe(true)
    expect(body.slots[0]).toHaveProperty('start_time_iso')
    await app.close()
  })

  it('POST /v1/patients returns created patient', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/patients',
      payload: {
        partner_patient_id: 'demo-001',
        first_name: 'Demo',
        last_name: 'User',
        phone_number: '5550000001',
        email: 'demo@example.com',
        date_of_birth: '1990-01-01',
        location: 'CA',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ patient_id: string }>()
    expect(body).toHaveProperty('patient_id')
    await app.close()
  })

  it('POST /v1/appointments returns created appointment', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/appointments',
      payload: {
        provider_id: 'provider-001-mock',
        patient_id: 'patient-001-mock',
        appointment_slot: '2030-06-02T16:00:00Z',
        appointment_details: {
          is_virtual: true,
          appointment_type: 'Individual',
          two_letter_state: 'CA',
        },
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ appointment_id: string; status: string }>()
    expect(body).toHaveProperty('appointment_id')
    expect(body.status).toBe('confirmed')
    await app.close()
  })
})

describe('correlation ID', () => {
  it('echoes x-request-id header back in the response', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'test-correlation-123' },
    })
    expect(res.headers['x-request-id']).toBe('test-correlation-123')
    await app.close()
  })

  it('generates a UUID x-request-id when none is provided', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    await app.close()
  })
})

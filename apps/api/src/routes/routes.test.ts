import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = {
    MOCK_BOOKINGS: true,
    AUTH0_TOKEN_URL: 'https://test.auth0.com/oauth/token',
    PARTNER_API_BASE_URL: 'https://api.test.example.com',
    PARTNER_API_AUDIENCE: 'https://api.test.example.com',
    PARTNER_API_CLIENT_ID: 'test-client-id',
    PARTNER_API_CLIENT_SECRET: 'test-client-secret',
    PARTNER_API_TIMEOUT_MS: 10_000,
    APP_BASE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'info' as const,
    NODE_ENV: 'test' as const,
    PORT: 4004,
  }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig, hasCredentials: true }))

vi.mock('../services/partnerApiClient.js', () => ({
  partnerApiClient: {
    request: vi.fn(),
  },
}))

import { partnerApiClient } from '../services/partnerApiClient.js'

const mockRequest = vi.mocked(partnerApiClient.request)

beforeEach(() => {
  mockConfig.MOCK_BOOKINGS = true
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', mockBookings: true })
    await app.close()
  })
})

describe('read routes (always hit partner API)', () => {
  it('GET /v1/insurances proxies to partner API', async () => {
    mockRequest.mockResolvedValueOnce({
      insurances: [
        { id: 'ins-1', carrier_display_name: 'Aetna', network_name: 'aetna', state: 'CA' },
      ],
    })
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/v1/insurances' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ insurances: Array<{ carrier_display_name: string }> }>()
    expect(body.insurances[0]).toHaveProperty('carrier_display_name', 'Aetna')
    await app.close()
  })

  it('POST /v1/providers/search proxies to partner API', async () => {
    mockRequest.mockResolvedValueOnce({
      providers: [{ provider_id: 'p-1', first_name: 'Sarah', last_name: 'Chen' }],
    })
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/v1/providers/search',
      payload: { two_letter_state: 'CA' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ providers: Array<{ provider_id: string }> }>()
    expect(body.providers[0]).toHaveProperty('provider_id', 'p-1')
    await app.close()
  })

  it('GET /v1/providers/slots proxies to partner API', async () => {
    mockRequest.mockResolvedValueOnce({
      slots: [
        {
          provider_id: 'p-1',
          start_time_iso: '2030-06-02T16:00:00Z',
          duration_mins: 50,
          location: 'telemedicine',
        },
      ],
    })
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/providers/slots?provider_uuid=p-1&two_letter_state=CA',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ slots: Array<{ start_time_iso: string }> }>()
    expect(body.slots[0]).toHaveProperty('start_time_iso')
    await app.close()
  })

  it('GET /v1/providers/:uuid proxies to partner API', async () => {
    mockRequest.mockResolvedValueOnce({
      id: 'p-1',
      first_name: 'Sarah',
      last_name: 'Chen',
    })
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/v1/providers/p-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('first_name', 'Sarah')
    await app.close()
  })
})

describe('write routes (mocked when MOCK_BOOKINGS=true)', () => {
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
    expect(res.json()).toHaveProperty('patient_id')
    await app.close()
  })

  it('POST /v1/appointments returns created appointment', async () => {
    vi.useFakeTimers()
    const app = await buildApp()
    const pendingRes = app.inject({
      method: 'POST',
      url: '/v1/appointments',
      payload: {
        provider_id: 'p-1',
        patient_id: 'patient-1',
        appointment_slot: '2030-06-02T16:00:00Z',
        appointment_details: {
          is_virtual: true,
          appointment_type: 'Individual',
          two_letter_state: 'CA',
        },
      },
    })
    await vi.runAllTimersAsync()
    const res = await pendingRes
    vi.useRealTimers()
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('appointment_id')
    expect(res.json()).toMatchObject({ status: 'confirmed' })
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

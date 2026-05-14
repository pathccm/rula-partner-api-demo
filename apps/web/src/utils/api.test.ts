import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = { API_BASE_URL: '', API_KEY: undefined as string | undefined }
  return { mockConfig }
})

vi.mock('./config', () => ({ default: mockConfig }))

function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(''),
    }),
  )
}

function mockFetchError(status: number, body = '') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'Error',
      text: () => Promise.resolve(body),
    }),
  )
}

beforeEach(() => {
  mockConfig.API_BASE_URL = ''
  mockConfig.API_KEY = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ApiError', () => {
  it('sets name and status correctly', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
  })
})

describe('request — error handling', () => {
  it('throws ApiError with the response status on non-2xx', async () => {
    mockFetchError(422, 'Unprocessable')
    await expect(api.getInsurances('CA')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'Unprocessable',
    })
  })

  it('uses statusText when body is empty', async () => {
    mockFetchError(500, '')
    await expect(api.getInsurances('CA')).rejects.toMatchObject({
      status: 500,
      message: 'Error',
    })
  })
})

describe('request — x-api-key header', () => {
  it('includes x-api-key header when API_KEY is set', async () => {
    mockConfig.API_KEY = 'secret-key'
    mockFetchOk({ insurances: [] })
    await api.getInsurances('CA')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>)['x-api-key']).toBe('secret-key')
  })

  it('omits x-api-key header when API_KEY is unset', async () => {
    mockFetchOk({ insurances: [] })
    await api.getInsurances('CA')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>)['x-api-key']).toBeUndefined()
  })
})

describe('api.getInsurances', () => {
  it('fetches the correct URL with state param', async () => {
    mockFetchOk({ insurances: [] })
    await api.getInsurances('NY')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/insurances?state=NY')
  })

  it('returns the insurances array', async () => {
    const insurances = [
      { id: '1', carrier_display_name: 'Aetna', network_name: 'aetna', state: 'CA' },
    ]
    mockFetchOk({ insurances })
    const result = await api.getInsurances('CA')
    expect(result.insurances).toEqual(insurances)
  })
})

describe('api.searchProviders', () => {
  it('POSTs to /v1/providers/search', async () => {
    mockFetchOk({ providers: [] })
    await api.searchProviders({ two_letter_state: 'CA' })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/providers/search')
    expect(init?.method).toBe('POST')
  })

  it('serializes params into the body', async () => {
    mockFetchOk({ providers: [] })
    await api.searchProviders({
      two_letter_state: 'CA',
      insurance: 'aetna',
      care_category: 'therapy',
      limit: 50,
    })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init?.body as string)).toEqual({
      two_letter_state: 'CA',
      insurance: 'aetna',
      care_category: 'therapy',
      limit: 50,
    })
  })
})

describe('api.getProviderDetail', () => {
  it('fetches /v1/providers/:id', async () => {
    mockFetchOk({ id: 'abc', first_name: 'Sarah', last_name: 'Chen' })
    await api.getProviderDetail('abc')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/providers/abc')
  })
})

describe('api.getSlots', () => {
  it('includes provider_uuid and two_letter_state params', async () => {
    mockFetchOk({ slots: [] })
    await api.getSlots('prov-1', 'CA', null)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('provider_uuid=prov-1')
    expect(url).toContain('two_letter_state=CA')
  })

  it('passes both location types when locationType is null', async () => {
    mockFetchOk({ slots: [] })
    await api.getSlots('prov-1', 'CA', null)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('location_type=in_person')
    expect(url).toContain('location_type=telemedicine')
  })

  it('passes only the selected location type', async () => {
    mockFetchOk({ slots: [] })
    await api.getSlots('prov-1', 'CA', 'telemedicine')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('location_type=telemedicine')
    expect(url).not.toContain('location_type=in_person')
  })
})

describe('api.createPatient', () => {
  it('POSTs to /v1/patients with all fields', async () => {
    const data = {
      partner_patient_id: 'p-1',
      first_name: 'Jane',
      last_name: 'Doe',
      phone_number: '5550001',
      email: 'jane@example.com',
      date_of_birth: '1990-01-01',
      location: 'CA',
      care_types: ['Individual'],
      is_eap_referral: false,
    }
    mockFetchOk({ patient_id: 'pt-1', partner_patient_id: 'p-1' })
    await api.createPatient(data)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/patients')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual(data)
  })
})

describe('api.bookAppointment', () => {
  it('POSTs to /v1/appointments with appointment details', async () => {
    const data = {
      patient_id: 'pt-1',
      provider_id: 'prov-1',
      appointment_slot: '2030-06-02T16:00:00Z',
      appointment_details: {
        is_virtual: true,
        appointment_type: 'Individual' as const,
        two_letter_state: 'CA',
      },
    }
    mockFetchOk({ appointment_id: 'appt-1', status: 'confirmed' })
    await api.bookAppointment(data)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/appointments')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual(data)
  })
})

describe('api.getPatientAppointments', () => {
  it('fetches /v1/patients/:id/appointments', async () => {
    mockFetchOk({ appointments: [] })
    await api.getPatientAppointments('pt-1')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/v1/patients/pt-1/appointments')
  })
})

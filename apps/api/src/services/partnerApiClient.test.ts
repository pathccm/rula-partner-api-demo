import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PartnerApiError } from '../errors.js'
import { partnerApiClient } from './partnerApiClient.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = {
    USE_MOCK_API: false,
    PARTNER_API_BASE_URL: 'https://api.partner.example.com',
    PARTNER_API_TIMEOUT_MS: 10_000,
  }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig }))
vi.mock('./tokenService.js', () => ({ getPartnerToken: vi.fn().mockResolvedValue('mock-token') }))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('partnerApiClient.request', () => {
  it('throws PartnerApiError(504) when the request times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        // Simulate the fetch hanging until aborted
        return new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }),
    )

    const resultPromise = partnerApiClient.request('/v1/providers/slots')
    // Attach .catch before advancing timers to avoid an unhandled rejection
    const errPromise = resultPromise.catch((e: unknown) => e)

    // Advance timers and drain microtasks so the abort propagates
    await vi.advanceTimersByTimeAsync(mockConfig.PARTNER_API_TIMEOUT_MS + 1)

    const err = await errPromise
    expect(err).toBeInstanceOf(PartnerApiError)
    expect((err as PartnerApiError).status).toBe(504)
    expect((err as PartnerApiError).message).toBe('Partner API request timed out')
  })

  it('propagates non-abort errors as-is', async () => {
    const networkError = new Error('Network failure')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError))

    const err = await partnerApiClient.request('/v1/providers/slots').catch((e: unknown) => e)
    expect(err).toBe(networkError)
    expect(err).not.toBeInstanceOf(PartnerApiError)
  })

  it('throws PartnerApiError with upstream status on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: () => Promise.resolve('Validation failed'),
      }),
    )

    const err = await partnerApiClient.request('/v1/appointments').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PartnerApiError)
    expect((err as PartnerApiError).status).toBe(422)
    expect((err as PartnerApiError).message).toBe('Validation failed')
  })

  it('returns parsed JSON on success', async () => {
    const payload = { uuid: 'abc-123' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      }),
    )

    const result = await partnerApiClient.request('/v1/providers/abc-123')
    expect(result).toEqual(payload)
  })
})

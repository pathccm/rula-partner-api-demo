import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PartnerApiError } from '../errors.js'
import { getPartnerToken, resetTokenCache } from './tokenService.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = {
    AUTH0_TOKEN_URL: 'https://auth.example.com/oauth/token',
    PARTNER_API_CLIENT_ID: 'test-client-id',
    PARTNER_API_CLIENT_SECRET: 'test-client-secret',
    PARTNER_API_BASE_URL: 'https://api.partner.example.com',
    PARTNER_API_AUDIENCE: 'https://api.partner.example.com/audience',
    LOG_LEVEL: 'info' as const,
    NODE_ENV: 'test' as const,
    PORT: 4004,
    APP_BASE_URL: 'http://localhost:3000',
  }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig }))

const MOCK_TOKEN = 'test-access-token'
const EXPIRES_IN = 3600

function mockFetchSuccess(token = MOCK_TOKEN, expiresIn = EXPIRES_IN) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' }),
    }),
  )
}

function mockFetchFailure(status = 401) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve('Unauthorized'),
    }),
  )
}

beforeEach(() => {
  resetTokenCache()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('getPartnerToken', () => {
  it('fetches a token from Auth0 and returns it', async () => {
    mockFetchSuccess()

    const token = await getPartnerToken()

    expect(token).toBe(MOCK_TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      mockConfig.AUTH0_TOKEN_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: mockConfig.PARTNER_API_CLIENT_ID,
          client_secret: mockConfig.PARTNER_API_CLIENT_SECRET,
          audience: mockConfig.PARTNER_API_AUDIENCE,
        }),
      }),
    )
  })

  it('caches the token and does not fetch again on second call', async () => {
    mockFetchSuccess()

    await getPartnerToken()
    const token = await getPartnerToken()

    expect(token).toBe(MOCK_TOKEN)
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
  })

  it('re-fetches when token is within 60s of expiry', async () => {
    mockFetchSuccess(MOCK_TOKEN, EXPIRES_IN)
    await getPartnerToken()

    // Advance time so cached token has < 60s remaining
    vi.advanceTimersByTime((EXPIRES_IN - 59) * 1000)

    // Replace fetch mock for the second call
    mockFetchSuccess('refreshed-token', EXPIRES_IN)
    const token = await getPartnerToken()

    expect(token).toBe('refreshed-token')
    // The new mock was called exactly once (the re-fetch)
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
  })

  it('throws PartnerApiError(502) on auth failure', async () => {
    mockFetchFailure(401)

    const err = await getPartnerToken().catch((e: unknown) => e)

    expect(err).toBeInstanceOf(PartnerApiError)
    expect((err as PartnerApiError).status).toBe(502)
    expect((err as PartnerApiError).message).toContain('Auth service unavailable (401)')
  })
})

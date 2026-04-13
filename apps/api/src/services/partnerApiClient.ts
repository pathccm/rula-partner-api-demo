import { config } from '../config.js'
import { PartnerApiError } from '../errors.js'
import { getPartnerToken } from './tokenService.js'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getPartnerToken()
  const baseUrl = config.USE_MOCK_API ? '' : config.PARTNER_API_BASE_URL!

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new PartnerApiError(res.status, body || res.statusText)
  }

  return res.json() as Promise<T>
}

export { PartnerApiError }
export const partnerApiClient = { request }

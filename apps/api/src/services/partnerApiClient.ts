import { config } from '../config.js'
import { getPartnerToken } from './tokenService.js'

export class PartnerApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PartnerApiError'
    this.status = status
  }
}

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

export const partnerApiClient = { request }

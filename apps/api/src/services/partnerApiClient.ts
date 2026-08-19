import { config } from '../config.js'
import { PartnerApiError, type PartnerApiErrorDetail } from '../errors.js'
import { getPartnerToken } from './tokenService.js'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getPartnerToken()
  const baseUrl = config.PARTNER_API_BASE_URL!

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.PARTNER_API_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PartnerApiError(504, 'Partner API request timed out')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    const text = await res.text()
    let message = text || res.statusText
    let errors: PartnerApiErrorDetail[] | undefined
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string; errors?: PartnerApiErrorDetail[] }
        message = parsed.message || message
        errors = parsed.errors
      } catch {
        // Upstream body wasn't JSON — fall back to the raw text as the message.
      }
    }
    throw new PartnerApiError(res.status, message, errors)
  }

  return res.json() as Promise<T>
}

export { PartnerApiError }
export const partnerApiClient = { request }

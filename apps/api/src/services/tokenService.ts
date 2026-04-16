import { config } from '../config.js'
import { PartnerApiError } from '../errors.js'

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

let cachedToken: { value: string; expiresAt: number } | null = null

export function resetTokenCache() {
  cachedToken = null
}

export async function getPartnerToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const res = await fetch(config.AUTH0_TOKEN_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.PARTNER_API_CLIENT_ID,
      client_secret: config.PARTNER_API_CLIENT_SECRET,
      audience: config.PARTNER_API_AUDIENCE,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new PartnerApiError(502, `Auth service unavailable (${res.status}): ${body}`)
  }

  const data = (await res.json()) as TokenResponse
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }
  return cachedToken.value
}

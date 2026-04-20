import { z } from 'zod'

const envSchema = z.object({
  VITE_AUTH0_ISSUER_DOMAIN: z.string().min(1, 'Auth0 domain is required'),
  VITE_AUTH0_AUDIENCE_URL: z.url(),
  VITE_AUTH0_CLIENT_ID: z.string().min(1, 'Auth0 client ID is required'),
  // Empty string means same origin (when served from the API). Set to http://localhost:4000 for local dev.
  VITE_API_BASE_URL: z.string().default(''),
  // Optional shared API key. When set, sent as x-api-key header on every request.
  VITE_API_KEY: z.string().optional(),
})

const rawConfig = envSchema.parse(import.meta.env)

const config = {
  AUTH0_ISSUER_DOMAIN: rawConfig.VITE_AUTH0_ISSUER_DOMAIN,
  AUTH0_AUDIENCE_URL: rawConfig.VITE_AUTH0_AUDIENCE_URL,
  AUTH0_CLIENT_ID: rawConfig.VITE_AUTH0_CLIENT_ID,
  API_BASE_URL: rawConfig.VITE_API_BASE_URL,
  API_KEY: rawConfig.VITE_API_KEY,
} as const

export default config

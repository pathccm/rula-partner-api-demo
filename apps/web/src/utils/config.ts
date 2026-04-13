import { z } from 'zod'

const envSchema = z.object({
  VITE_AUTH0_ISSUER_DOMAIN: z.string().min(1, 'Auth0 domain is required'),
  VITE_AUTH0_AUDIENCE_URL: z.url(),
  VITE_AUTH0_CLIENT_ID: z.string().min(1, 'Auth0 client ID is required'),
  VITE_API_BASE_URL: z.string().min(1).default('http://localhost:4000'),
})

const rawConfig = envSchema.parse(import.meta.env)

const config = {
  AUTH0_ISSUER_DOMAIN: rawConfig.VITE_AUTH0_ISSUER_DOMAIN,
  AUTH0_AUDIENCE_URL: rawConfig.VITE_AUTH0_AUDIENCE_URL,
  AUTH0_CLIENT_ID: rawConfig.VITE_AUTH0_CLIENT_ID,
  API_BASE_URL: rawConfig.VITE_API_BASE_URL,
} as const

export default config

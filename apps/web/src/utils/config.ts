import { z } from 'zod'

const envSchema = z.object({
  // Empty string means same origin (when served from the API). Set to http://localhost:4004 for local dev.
  VITE_API_BASE_URL: z.string().default(''),
  // Optional shared API key. When set, sent as x-api-key header on every request.
  VITE_API_KEY: z.string().optional(),
})

const rawConfig = envSchema.parse(import.meta.env)

const config = {
  API_BASE_URL: rawConfig.VITE_API_BASE_URL,
  API_KEY: rawConfig.VITE_API_KEY,
} as const

export default config

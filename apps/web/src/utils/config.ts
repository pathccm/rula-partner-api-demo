import { z } from 'zod'

const envSchema = z.object({
  // Empty string means same origin (when served from the API). Set to http://localhost:4004 for local dev.
  VITE_API_BASE_URL: z.string().default(''),
})

const rawConfig = envSchema.parse(import.meta.env)

const config = {
  API_BASE_URL: rawConfig.VITE_API_BASE_URL,
} as const

export default config

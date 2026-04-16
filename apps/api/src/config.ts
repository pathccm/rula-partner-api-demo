import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4004),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // When true, POST /v1/patients and POST /v1/appointments use mock handlers
  // instead of the real partner API. Read endpoints always hit the real API.
  USE_MOCK_API: z
    .string()
    .transform((v: string) => v === 'true' || v === '1')
    .default(true),

  PARTNER_API_BASE_URL: z.url(),
  PARTNER_API_AUDIENCE: z.url(),
  AUTH0_TOKEN_URL: z.url(),
  PARTNER_API_CLIENT_ID: z.string().min(1),
  PARTNER_API_CLIENT_SECRET: z.string().min(1),

  // Timeout for outbound partner API requests (ms)
  PARTNER_API_TIMEOUT_MS: z.coerce.number().default(10_000),

  APP_BASE_URL: z.url().default('http://localhost:3000'),
})

export const config = envSchema.parse(process.env)

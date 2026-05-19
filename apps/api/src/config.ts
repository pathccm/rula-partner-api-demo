import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4004),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // When true, write endpoints (patient creation, booking) use mock handlers.
  // When false, state MB uses the real partner API; all other states still mock.
  // When credentials are absent, all endpoints use mocks regardless of this setting.
  USE_MOCK_API: z
    .string()
    .transform((v: string) => v === 'true' || v === '1')
    .default(true),

  // Credentials are optional — when absent the app runs in full mock mode.
  PARTNER_API_BASE_URL: z.url().optional(),
  PARTNER_API_AUDIENCE: z.url().optional(),
  AUTH0_TOKEN_URL: z.url().optional(),
  PARTNER_API_CLIENT_ID: z.string().min(1).optional(),
  PARTNER_API_CLIENT_SECRET: z.string().min(1).optional(),

  // Shared API key for protecting BFF routes. When set, all /v1/* requests must
  // include a matching x-api-key header. When unset, enforcement is skipped (local dev).
  API_KEY: z.string().optional(),

  // Timeout for outbound partner API requests (ms)
  PARTNER_API_TIMEOUT_MS: z.coerce.number().default(10_000),

  APP_BASE_URL: z.url().default('http://localhost:3000'),
})

export const config = envSchema.parse(process.env)

export const hasCredentials = Boolean(
  config.PARTNER_API_BASE_URL &&
    config.PARTNER_API_AUDIENCE &&
    config.AUTH0_TOKEN_URL &&
    config.PARTNER_API_CLIENT_ID &&
    config.PARTNER_API_CLIENT_SECRET,
)

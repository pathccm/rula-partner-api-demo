import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  USE_MOCK_API: z
    .string()
    .transform((v: string) => v === 'true' || v === '1')
    .default(true),

  PARTNER_API_BASE_URL: z.url().optional(),
  AUTH0_TOKEN_URL: z.url().optional(),
  PARTNER_API_CLIENT_ID: z.string().optional(),
  PARTNER_API_CLIENT_SECRET: z.string().optional(),

  // Auth0 config for verifying incoming frontend JWTs
  AUTH0_ISSUER_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE_URL: z.url().optional(),

  // Timeout for outbound partner API requests (ms)
  PARTNER_API_TIMEOUT_MS: z.coerce.number().default(10_000),

  APP_BASE_URL: z.url().default('http://localhost:3000'),
})

export const config = envSchema.parse(process.env)

if (!config.USE_MOCK_API) {
  const required = [
    'PARTNER_API_BASE_URL',
    'AUTH0_TOKEN_URL',
    'PARTNER_API_CLIENT_ID',
    'PARTNER_API_CLIENT_SECRET',
    'AUTH0_ISSUER_DOMAIN',
    'AUTH0_AUDIENCE_URL',
  ] as const
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`${key} is required when USE_MOCK_API=false`)
    }
  }
}

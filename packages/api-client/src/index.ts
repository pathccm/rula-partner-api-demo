// Auto-generated types — do not edit. Run `pnpm generate:client` to regenerate.

// Re-export openapi-fetch for building a typed client against the partner API.
// Usage in apps/api:
//   import createClient from 'openapi-fetch'
//   import type { paths } from '@partner-scheduling-demo/api-client'
//   const client = createClient<paths>({ baseUrl: process.env.PARTNER_API_BASE_URL })
export { default as createClient } from 'openapi-fetch'
export type { components, operations, paths } from './generated.ts'

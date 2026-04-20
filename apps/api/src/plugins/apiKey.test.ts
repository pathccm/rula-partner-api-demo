import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyApiKey } from './apiKey.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = { API_KEY: 'test-secret' }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig }))

async function buildTestApp() {
  const app = Fastify({ logger: false })
  app.get('/v1/test', { preHandler: verifyApiKey }, async () => ({ ok: true }))
  app.get('/health', async () => ({ status: 'ok' }))
  return app
}

beforeEach(() => {
  mockConfig.API_KEY = 'test-secret'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('verifyApiKey', () => {
  it('returns 401 when x-api-key header is missing', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/v1/test' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
    await app.close()
  })

  it('returns 401 when x-api-key header is incorrect', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/test',
      headers: { 'x-api-key': 'wrong-secret' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
    await app.close()
  })

  it('allows request with correct x-api-key header', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/test',
      headers: { 'x-api-key': 'test-secret' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true })
    await app.close()
  })

  it('skips enforcement when API_KEY is not set', async () => {
    mockConfig.API_KEY = undefined as unknown as string
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/v1/test' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('health endpoint is not subject to API key (no preHandler applied)', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})

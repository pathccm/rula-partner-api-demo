import fastifyJwt from '@fastify/jwt'
import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { verifyJwt } from './auth.js'

const { mockConfig } = vi.hoisted(() => {
  const mockConfig = { USE_MOCK_API: false }
  return { mockConfig }
})

vi.mock('../config.js', () => ({ config: mockConfig }))

async function buildTestApp() {
  const app = Fastify({ logger: false })
  // Register JWT with a simple string secret (no JWKS needed in tests)
  await app.register(fastifyJwt, { secret: 'test-secret' })
  app.get('/protected', { preHandler: verifyJwt }, async () => ({ ok: true }))
  return app
}

describe('verifyJwt', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
    await app.close()
  })

  it('returns 401 with a malformed token', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
    await app.close()
  })

  it('allows request with a valid token', async () => {
    const app = await buildTestApp()
    const token = app.jwt.sign({ sub: 'user-123' })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true })
    await app.close()
  })

  it('passes through without checking token when USE_MOCK_API=true', async () => {
    mockConfig.USE_MOCK_API = true
    const app = Fastify({ logger: false })
    // No JWT plugin registered (mock mode skips auth setup)
    app.get('/protected', { preHandler: verifyJwt }, async () => ({ ok: true }))
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(200)
    mockConfig.USE_MOCK_API = false
    await app.close()
  })
})

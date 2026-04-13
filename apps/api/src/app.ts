import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance } from 'fastify'
import { config } from './config.js'
import { authPlugin, verifyJwt } from './plugins/auth.js'
import { appointmentsRoutes } from './routes/appointments.js'
import { insurancesRoutes } from './routes/insurances.js'
import { patientsRoutes } from './routes/patients.js'
import { providersRoutes } from './routes/providers.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const WEB_DIST = join(__dirname, '../../web/dist')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildApp(opts: { logger?: any } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
  })

  await app.register(cors, {
    origin: config.APP_BASE_URL,
    credentials: true,
  })

  await app.register(authPlugin)

  app.get('/health', async () => ({ status: 'ok', mockMode: config.USE_MOCK_API }))

  // Encapsulated scope: verifyJwt hook applies to all proxy routes
  await app.register(async (sub) => {
    sub.addHook('preHandler', verifyJwt)
    await sub.register(insurancesRoutes)
    await sub.register(providersRoutes)
    await sub.register(patientsRoutes)
    await sub.register(appointmentsRoutes)
  })

  // Serve the built React app when the dist folder exists
  if (existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, {
      root: WEB_DIST,
      wildcard: false,
    })

    // SPA fallback — only for browser navigation (GET + Accept: text/html).
    // API routes that don't exist still get a JSON 404.
    app.setNotFoundHandler((request, reply) => {
      const isBrowserNav =
        request.method === 'GET' && request.headers.accept?.includes('text/html')
      if (isBrowserNav) {
        reply.sendFile('index.html')
      } else {
        reply.status(404).send({ error: 'Not found' })
      }
    })
  }

  app.setErrorHandler(
    (error: Error & { statusCode?: number; status?: number }, _request, reply) => {
      const statusCode =
        typeof error.statusCode === 'number'
          ? error.statusCode
          : typeof error.status === 'number'
            ? error.status
            : 500
      reply.status(statusCode).send({ error: error.message })
    },
  )

  return app
}

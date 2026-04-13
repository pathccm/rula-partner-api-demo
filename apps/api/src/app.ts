import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { config } from './config.js'
import { authPlugin, verifyJwt } from './plugins/auth.js'
import { appointmentsRoutes } from './routes/appointments.js'
import { insurancesRoutes } from './routes/insurances.js'
import { patientsRoutes } from './routes/patients.js'
import { providersRoutes } from './routes/providers.js'

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

  const routeOptions = { preHandler: verifyJwt }
  await app.register(insurancesRoutes, routeOptions)
  await app.register(providersRoutes, routeOptions)
  await app.register(patientsRoutes, routeOptions)
  await app.register(appointmentsRoutes, routeOptions)

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

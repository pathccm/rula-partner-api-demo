import cors from '@fastify/cors'
import Fastify from 'fastify'
import { config } from './config.js'
import { appointmentsRoutes } from './routes/appointments.js'
import { insurancesRoutes } from './routes/insurances.js'
import { patientsRoutes } from './routes/patients.js'
import { providersRoutes } from './routes/providers.js'

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

await app.register(cors, {
  origin: config.APP_BASE_URL,
  credentials: true,
})

// Health check
app.get('/health', async () => ({ status: 'ok', mockMode: config.USE_MOCK_API }))

// Register route handlers
await app.register(insurancesRoutes)
await app.register(providersRoutes)
await app.register(patientsRoutes)
await app.register(appointmentsRoutes)

// Error handler
app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  app.log.error(error)
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
  reply.status(statusCode).send({ error: error.message })
})

try {
  const address = await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`Server listening at ${address} (mockMode=${config.USE_MOCK_API})`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

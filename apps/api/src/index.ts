import { buildApp } from './app.js'
import { config } from './config.js'

const app = await buildApp({
  logger: {
    level: config.LOG_LEVEL,
    // Redact PII fields at any depth in logged objects
    redact: [
      'req.body.first_name',
      'req.body.last_name',
      'req.body.email',
      'req.body.phone_number',
      'req.body.date_of_birth',
      '*.first_name',
      '*.last_name',
      '*.email',
      '*.phone_number',
      '*.date_of_birth',
    ],
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

try {
  const address = await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`Server listening at ${address} (mockBookings=${config.MOCK_BOOKINGS})`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

import { buildApp } from './app.js'
import { config } from './config.js'

const app = await buildApp({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

try {
  const address = await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`Server listening at ${address} (mockMode=${config.USE_MOCK_API})`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

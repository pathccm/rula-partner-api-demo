import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config.js'

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  if (!config.API_KEY) return

  const provided = request.headers['x-api-key']
  if (!provided || provided !== config.API_KEY) {
    request.log.warn({ url: request.url }, 'API key check failed')
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

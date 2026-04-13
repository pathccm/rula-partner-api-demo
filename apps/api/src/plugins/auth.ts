import fastifyJwt, { type TokenOrHeader } from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import jwksClient from 'jwks-rsa'
import { config } from '../config.js'

export async function authPlugin(app: FastifyInstance) {
  if (config.USE_MOCK_API) return

  const issuer = `https://${config.AUTH0_ISSUER_DOMAIN}/`
  const client = jwksClient({ jwksUri: `${issuer}.well-known/jwks.json`, cache: true })

  await app.register(fastifyJwt, {
    secret: (_request: FastifyRequest, tokenOrHeader: TokenOrHeader): Promise<string> => {
      const kid = 'header' in tokenOrHeader ? tokenOrHeader.header.kid : undefined
      return new Promise<string>((resolve, reject) => {
        client.getSigningKey(kid ?? '', (err, key) => {
          if (err) reject(err)
          else resolve(key?.getPublicKey() ?? '')
        })
      })
    },
    verify: {
      allowedAud: config.AUTH0_AUDIENCE_URL,
      allowedIss: issuer,
    },
  })
}

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  if (config.USE_MOCK_API) return
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'

export async function insurancesRoutes(app: FastifyInstance) {
  app.get('/v1/insurances', async () => {
    if (config.USE_MOCK_API) return mockHandlers.getInsurances()
    return partnerApiClient.request('/v1/insurances')
  })
}

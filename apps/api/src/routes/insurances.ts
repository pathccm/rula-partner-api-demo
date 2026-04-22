import type { FastifyInstance } from 'fastify'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type { InsurancesResponse } from '../types.js'

export async function insurancesRoutes(app: FastifyInstance) {
  app.get('/v1/insurances', async (request) => {
    const { state } = request.query as { state?: string }
    const params = state ? `?state=${encodeURIComponent(state)}` : ''
    return partnerApiClient.request<InsurancesResponse>(`/v1/insurances${params}`)
  })
}

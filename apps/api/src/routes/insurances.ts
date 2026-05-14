import type { FastifyInstance } from 'fastify'
import { hasCredentials } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type { InsurancesResponse } from '../types.js'

export async function insurancesRoutes(app: FastifyInstance) {
  app.get('/v1/insurances', async (request) => {
    if (!hasCredentials) return mockHandlers.getInsurances()
    const { state } = request.query as { state?: string }
    const params = state ? `?state=${encodeURIComponent(state)}` : ''
    const res = await partnerApiClient.request<InsurancesResponse>(`/v1/insurances${params}`)
    const seen = new Set<string>()
    return {
      ...res,
      insurances: res.insurances.filter((ins) => {
        if (seen.has(ins.carrier_display_name)) return false
        seen.add(ins.carrier_display_name)
        return true
      }),
    }
  })
}

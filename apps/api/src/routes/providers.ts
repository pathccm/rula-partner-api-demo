import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'

export async function providersRoutes(app: FastifyInstance) {
  app.post('/v1/providers/search', async (request) => {
    if (config.USE_MOCK_API) return mockHandlers.searchProviders()
    return partnerApiClient.request('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(request.body),
    })
  })

  app.get('/v1/providers/slots', async (request) => {
    if (config.USE_MOCK_API) {
      const query = request.query as Record<string, string>
      return mockHandlers.getSlots(query.provider_uuid ?? '')
    }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(
      request.query as Record<string, string | string[] | undefined | null>,
    )) {
      if (value == null) continue
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item))
      } else {
        params.append(key, String(value))
      }
    }
    return partnerApiClient.request(`/v1/providers/slots?${params.toString()}`)
  })

  app.get<{ Params: { uuid: string } }>('/v1/providers/:uuid', async (request) => {
    if (config.USE_MOCK_API) {
      return {
        uuid: request.params.uuid,
        first_name: 'Mock',
        last_name: 'Provider',
        specialty: 'Therapy',
        state: 'CA',
      }
    }
    return partnerApiClient.request(`/v1/providers/${request.params.uuid}`)
  })
}

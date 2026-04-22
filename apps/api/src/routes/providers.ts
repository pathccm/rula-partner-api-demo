import type { FastifyInstance } from 'fastify'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type {
  ProviderShowResponse,
  ProvidersSearchBody,
  ProvidersSearchResponse,
  ProvidersSlotsResponse,
} from '../types.js'

export async function providersRoutes(app: FastifyInstance) {
  app.post('/v1/providers/search', async (request) => {
    return partnerApiClient.request<ProvidersSearchResponse>('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(request.body as ProvidersSearchBody),
    })
  })

  app.get('/v1/providers/slots', async (request) => {
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
    return partnerApiClient.request<ProvidersSlotsResponse>(
      `/v1/providers/slots?${params.toString()}`,
    )
  })

  app.get<{ Params: { uuid: string } }>('/v1/providers/:uuid', async (request) => {
    return partnerApiClient.request<ProviderShowResponse>(`/v1/providers/${request.params.uuid}`)
  })
}

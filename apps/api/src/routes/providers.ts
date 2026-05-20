import type { FastifyInstance } from 'fastify'
import { config, hasCredentials } from '../config.js'
import { GENDER_MAP, LANGUAGE_MAP, RACE_MAP, SPECIALIZATION_MAP } from '../filterMaps.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type {
  ProviderShowResponse,
  ProvidersSearchBody,
  ProvidersSearchResponse,
  ProvidersSlotsResponse,
} from '../types.js'

export async function providersRoutes(app: FastifyInstance) {
  app.post('/v1/providers/search', async (request) => {
    if (config.USE_MOCK_API || !hasCredentials) return mockHandlers.searchProviders()
    const body = request.body as ProvidersSearchBody
    const mapped = {
      ...body,
      ...(body.language != null && { language: LANGUAGE_MAP[body.language] ?? body.language }),
      ...(body.gender != null && { gender: GENDER_MAP[body.gender] ?? body.gender }),
      ...(body.race != null && { race: RACE_MAP[body.race] ?? body.race }),
      ...(body.specialization != null && {
        specialization: SPECIALIZATION_MAP[body.specialization] ?? body.specialization,
      }),
    }
    return partnerApiClient.request<ProvidersSearchResponse>('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(mapped),
    })
  })

  app.get('/v1/providers/slots', async (request) => {
    if (config.USE_MOCK_API || !hasCredentials) return mockHandlers.getSlots()
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
    if (config.USE_MOCK_API || !hasCredentials) return mockHandlers.getProvider(request.params.uuid)
    return partnerApiClient.request<ProviderShowResponse>(`/v1/providers/${request.params.uuid}`)
  })
}

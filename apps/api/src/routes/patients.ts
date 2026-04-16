import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type {
  PatientAppointmentsResponse,
  PatientCreateBody,
  PatientCreateResponse,
} from '../types.js'

export async function patientsRoutes(app: FastifyInstance) {
  app.post('/v1/patients', async (request) => {
    const body = request.body as PatientCreateBody
    if (config.USE_MOCK_API) return mockHandlers.createPatient(body)
    return partnerApiClient.request<PatientCreateResponse>('/v1/patients', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  })

  app.get<{ Params: { uuid: string } }>('/v1/patients/:uuid/appointments', async (request) => {
    if (config.USE_MOCK_API) return []
    return partnerApiClient.request<PatientAppointmentsResponse>(
      `/v1/patients/${request.params.uuid}/appointments`,
    )
  })
}

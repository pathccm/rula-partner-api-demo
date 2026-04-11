import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'

export async function appointmentsRoutes(app: FastifyInstance) {
  app.post('/v1/appointments', async (request) => {
    const body = request.body as {
      provider_uuid: string
      patient_uuid: string
      start_time: string
      end_time: string
      appointment_type: string
    }
    if (config.USE_MOCK_API) return mockHandlers.createAppointment(body)
    return partnerApiClient.request('/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  })
}

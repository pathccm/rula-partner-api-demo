import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { mockHandlers } from '../plugins/mockHandler.js'
import { partnerApiClient } from '../services/partnerApiClient.js'
import type { AppointmentsCreateBody, AppointmentsCreateResponse } from '../types.js'

export async function appointmentsRoutes(app: FastifyInstance) {
  app.post('/v1/appointments', async (request) => {
    const body = request.body as AppointmentsCreateBody
    if (config.MOCK_BOOKINGS || body.appointment_details.two_letter_state !== 'MB') {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return mockHandlers.createAppointment(body)
    }
    return partnerApiClient.request<AppointmentsCreateResponse>('/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  })
}

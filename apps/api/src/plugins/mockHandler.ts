import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppointmentsCreateBody, PatientCreateBody } from '../types.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const MOCKS_DIR = join(__dirname, '../../../../mocks')

function loadFixture<T>(name: string): T {
  const filePath = join(MOCKS_DIR, `${name}.json`)
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export const mockHandlers = {
  searchProviders() {
    return loadFixture('providers')
  },

  getSlots(providerId: string) {
    const slots = loadFixture<Array<{ provider_id: string }>>('slots')
    return { slots: slots.filter((slot) => slot.provider_id === providerId) }
  },

  createPatient(data: PatientCreateBody) {
    return {
      patient_id: `mock-patient-${Date.now()}`,
      partner_patient_id: data.partner_patient_id,
    }
  },

  createAppointment(data: AppointmentsCreateBody) {
    return {
      appointment_id: `mock-appt-${Date.now()}`,
      provider_id: data.provider_id,
      patient_id: data.patient_id,
      appointment_slot: data.appointment_slot,
      appointment_details: data.appointment_details,
      status: 'confirmed',
    }
  },

  getInsurances() {
    return loadFixture('insurances')
  },
}

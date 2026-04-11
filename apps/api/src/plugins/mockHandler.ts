import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

  getSlots(_providerUuid: string) {
    return loadFixture('slots')
  },

  createPatient(data: { first_name: string; last_name: string; email: string }) {
    return {
      uuid: `mock-patient-${Date.now()}`,
      ...data,
    }
  },

  createAppointment(data: {
    provider_uuid: string
    patient_uuid: string
    start_time: string
    end_time: string
    appointment_type: string
  }) {
    return {
      uuid: `mock-appt-${Date.now()}`,
      ...data,
      status: 'confirmed',
    }
  },

  getInsurances() {
    return loadFixture('insurances')
  },
}

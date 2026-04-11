import config from './config'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${config.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body || res.statusText)
  }
  return res.json() as Promise<T>
}

export interface ProviderSearchParams {
  state: string
  insurance_carrier_name?: string
  specialty?: string
}

export interface Provider {
  uuid: string
  first_name: string
  last_name: string
  specialty: string
  state: string
}

export interface Slot {
  start_time: string
  end_time: string
  appointment_type: 'in_person' | 'telemedicine'
  provider_uuid: string
}

export interface Patient {
  uuid: string
  first_name: string
  last_name: string
  email: string
}

export interface Appointment {
  uuid: string
  provider_uuid: string
  patient_uuid: string
  start_time: string
  end_time: string
  appointment_type: 'in_person' | 'telemedicine'
  status: string
}

export const api = {
  searchProviders(params: ProviderSearchParams, token: string) {
    return request<Provider[]>('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  getSlots(
    providerUuid: string,
    state: string,
    token: string,
    appointmentType?: 'in_person' | 'telemedicine',
  ) {
    const params = new URLSearchParams({
      provider_uuid: providerUuid,
      two_letter_state: state,
    })
    if (appointmentType) params.append('location_type', appointmentType)
    return request<Slot[]>(`/v1/providers/slots?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  createPatient(data: { first_name: string; last_name: string; email: string }, token: string) {
    return request<Patient>('/v1/patients', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  bookAppointment(
    data: {
      provider_uuid: string
      patient_uuid: string
      start_time: string
      end_time: string
      appointment_type: 'in_person' | 'telemedicine'
    },
    token: string,
  ) {
    return request<Appointment>('/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

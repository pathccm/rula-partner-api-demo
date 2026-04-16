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

// Types aligned to the partner-scheduling-api spec (v0.23.2)

export interface Provider {
  provider_id: string
  first_name: string
  last_name: string
  specialty?: string
  state?: string
}

export interface Slot {
  provider_id: string
  start_time_iso: string
  duration_mins: number
  location: 'in_person' | 'telemedicine'
}

export interface Patient {
  patient_id: string
  partner_patient_id: string
}

export interface Appointment {
  appointment_id: string
  provider_id: string
  patient_id: string
  appointment_slot: string
  appointment_details: {
    is_virtual: boolean
    appointment_type: string
    two_letter_state: string
  }
  status: string
}

export const api = {
  searchProviders(params: { two_letter_state: string; insurance?: string }, token: string) {
    return request<{ providers: Provider[] }>('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  getSlots(providerId: string, state: string, token: string) {
    const params = new URLSearchParams({
      provider_uuid: providerId,
      two_letter_state: state,
    })
    return request<{ slots: Slot[] }>(`/v1/providers/slots?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  createPatient(
    data: {
      partner_patient_id: string
      first_name: string
      last_name: string
      phone_number: string
      email: string
      date_of_birth: string
      location: string
    },
    token: string,
  ) {
    return request<Patient>('/v1/patients', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  bookAppointment(
    data: {
      patient_id: string
      provider_id: string
      appointment_slot: string
      appointment_details: {
        is_virtual: boolean
        appointment_type: 'Individual' | 'Couples' | 'Family' | '15 min Consult' | 'Psychiatry'
        two_letter_state: string
      }
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

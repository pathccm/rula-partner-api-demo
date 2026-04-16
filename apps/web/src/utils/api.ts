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

export interface Insurance {
  id: string
  carrier_display_name: string
  /** Use this value in the `insurance` field when searching for providers */
  network_name: string
  state: string
}

export interface Provider {
  id: string
  first_name: string
  last_name: string
  profile_bio?: string
  genders?: string[]
  slot_start_time?: string
}

export interface ProviderDetail {
  id: string
  first_name: string
  last_name: string
  profile_image_url?: string
  profile_bio?: string
  profile_summary?: string
  profile_approach?: string
  profile_focus?: string
  profile_journey?: string
  profile_goals?: string
  profile_first_session?: string
  role_string?: 'Therapist' | 'Prescriber' | 'Unknown'
  insurances?: string[]
  active_states?: string[]
  willing_to_see?: (
    | 'adults'
    | 'children'
    | 'minors'
    | 'preteen'
    | 'individuals'
    | 'couples'
    | 'families'
  )[]
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

export interface AppointmentStatus {
  appointment_id: string
  provider_id: string
  start_time: string
  end_time: string
  status: 'held' | 'confirmed' | 'canceled' | 'completed'
  appointment_type: 'telemedicine' | 'in_person'
  therapy_type: string
}

export const api = {
  getInsurances(state: string) {
    return request<{ insurances: Insurance[] }>(`/v1/insurances?state=${encodeURIComponent(state)}`)
  },

  searchProviders(params: {
    two_letter_state: string
    insurance?: string
    care_category?: 'therapy' | 'psychiatry'
    limit?: number
  }) {
    return request<{ providers: Provider[] }>('/v1/providers/search', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  getProviderDetail(providerId: string) {
    return request<ProviderDetail>(`/v1/providers/${providerId}`)
  },

  getSlots(providerId: string, state: string, locationType: 'telemedicine' | 'in_person' | null) {
    const params = new URLSearchParams({
      provider_uuid: providerId,
      two_letter_state: state,
    })
    if (locationType) {
      params.append('location_type', locationType)
    } else {
      params.append('location_type', 'in_person')
      params.append('location_type', 'telemedicine')
    }
    return request<{ slots: Slot[] }>(`/v1/providers/slots?${params.toString()}`)
  },

  createPatient(data: {
    partner_patient_id: string
    first_name: string
    last_name: string
    phone_number: string
    email: string
    date_of_birth: string
    location: string
  }) {
    return request<Patient>('/v1/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  bookAppointment(data: {
    patient_id: string
    provider_id: string
    appointment_slot: string
    appointment_details: {
      is_virtual: boolean
      appointment_type: 'Individual' | 'Couples' | 'Family' | '15 min Consult' | 'Psychiatry'
      two_letter_state: string
    }
  }) {
    return request<Appointment>('/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getPatientAppointments(patientId: string) {
    return request<{ appointments: AppointmentStatus[] }>(`/v1/patients/${patientId}/appointments`)
  },
}

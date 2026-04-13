// Shared types between apps/web and apps/api

export type AppointmentType = 'in_person' | 'telemedicine'

export interface Provider {
  uuid: string
  first_name: string
  last_name: string
  specialty: string
  state: string
  insurance_carriers?: string[]
  care_types?: string[]
  appointment_types?: AppointmentType[]
}

export interface Slot {
  provider_uuid: string
  start_time: string
  end_time: string
  appointment_type: AppointmentType
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
  appointment_type: AppointmentType
  status: string
}

export interface Insurance {
  uuid: string
  name: string
}

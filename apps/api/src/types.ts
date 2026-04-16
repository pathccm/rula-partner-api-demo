// Type aliases derived from the generated OpenAPI client.
// These flow from packages/api-client/src/generated.ts — no manual `any` casts.
import type { components } from '@partner-scheduling-demo/api-client'

type Req<K extends keyof components['requestBodies']> =
  components['requestBodies'][K]['content']['application/json']

type Res<K extends keyof components['responses']> =
  components['responses'][K]['content']['application/json']

// Request bodies
export type ProvidersSearchBody = Req<'ProvidersSearchRequest'>
export type PatientCreateBody = Req<'PatientCreateRequest'>
export type AppointmentsCreateBody = Req<'AppointmentsCreateRequest'>

// Responses
export type InsurancesResponse = Res<'InsurancesIndexResponse'>
export type ProvidersSearchResponse = Res<'ProvidersSearchResponse'>
export type ProvidersSlotsResponse = Res<'ProvidersSlotsResponse'>
export type ProviderShowResponse = Res<'ProvidersShowResponse'>
export type PatientCreateResponse = Res<'PatientCreateResponse'>
export type PatientAppointmentsResponse = Res<'PatientAppointmentsResponse'>
export type AppointmentsCreateResponse = Res<'AppointmentsCreateResponse'>

import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { getErrorInfo } from './errorMessage'

describe('getErrorInfo — non-ApiError input', () => {
  it('returns generic type with the error message for a plain Error', () => {
    const result = getErrorInfo(new Error('something broke'))
    expect(result.type).toBe('generic')
    expect(result.message).toBe('something broke')
  })

  it('returns generic type with fallback message for non-Error values', () => {
    const result = getErrorInfo('oops')
    expect(result.type).toBe('generic')
    expect(result.message).toBe('An unexpected error occurred.')
  })

  it('returns generic type for null', () => {
    expect(getErrorInfo(null).type).toBe('generic')
  })
})

describe('getErrorInfo — ApiError status codes', () => {
  it('maps 401 → auth', () => {
    const result = getErrorInfo(new ApiError(401, 'Unauthorized'))
    expect(result.type).toBe('auth')
    expect(result.message).toBeTruthy()
  })

  it('maps 404 → not-found for an unrecognized message', () => {
    const result = getErrorInfo(new ApiError(404, 'Not Found'))
    expect(result.type).toBe('not-found')
  })

  it('maps 422 → validation', () => {
    const result = getErrorInfo(new ApiError(422, 'Validation failed'))
    expect(result.type).toBe('validation')
  })

  it('uses the ApiError message for 422', () => {
    const result = getErrorInfo(new ApiError(422, 'Email is already taken'))
    expect(result.message).toBe('Email is already taken')
  })

  it('maps 502 → upstream', () => {
    const result = getErrorInfo(new ApiError(502, 'Bad Gateway'))
    expect(result.type).toBe('upstream')
  })

  it('maps 500 → generic', () => {
    const result = getErrorInfo(new ApiError(500, 'Internal Server Error'))
    expect(result.type).toBe('generic')
  })

  it('maps 400 → generic', () => {
    const result = getErrorInfo(new ApiError(400, 'Bad Request'))
    expect(result.type).toBe('generic')
  })

  it('maps unknown status → generic with status in message', () => {
    const result = getErrorInfo(new ApiError(418, "I'm a teapot"))
    expect(result.type).toBe('generic')
    expect(result.message).toContain('418')
  })
})

describe('getErrorInfo — booking error messages (POST /v1/appointments)', () => {
  it('maps "Patient not found" → not-found, not retryable by slot', () => {
    const result = getErrorInfo(new ApiError(404, 'Patient not found'))
    expect(result.type).toBe('not-found')
  })

  it('maps "Provider not found for requested appointment" → conflict', () => {
    const result = getErrorInfo(new ApiError(404, 'Provider not found for requested appointment'))
    expect(result.type).toBe('conflict')
  })

  it('maps "Slot not found for requested appointment" → conflict', () => {
    const result = getErrorInfo(new ApiError(404, 'Slot not found for requested appointment'))
    expect(result.type).toBe('conflict')
  })

  it('maps "Appointment time conflict" → conflict', () => {
    const result = getErrorInfo(new ApiError(422, 'Appointment time conflict'))
    expect(result.type).toBe('conflict')
  })

  it('maps the 25-hour booking window message → conflict', () => {
    const result = getErrorInfo(
      new ApiError(422, 'Cannot create hold for time slot less than 25 hours in advance'),
    )
    expect(result.type).toBe('conflict')
  })

  it('maps a provider age-group mismatch → provider-mismatch', () => {
    const result = getErrorInfo(new ApiError(422, 'Provider is not willing to see adults'))
    expect(result.type).toBe('provider-mismatch')
  })

  it('maps a provider role mismatch → provider-mismatch', () => {
    const result = getErrorInfo(
      new ApiError(422, 'Provider is a therapist but appointment is for psychiatry'),
    )
    expect(result.type).toBe('provider-mismatch')
  })

  it('maps a provider insurance mismatch → provider-mismatch', () => {
    const result = getErrorInfo(new ApiError(422, "Provider does not take patient's insurance"))
    expect(result.type).toBe('provider-mismatch')
  })

  it('maps a not-bookable provider → provider-mismatch', () => {
    const result = getErrorInfo(
      new ApiError(422, 'Provider is not currently available to be booked'),
    )
    expect(result.type).toBe('provider-mismatch')
  })

  it('maps a restricted patient → restricted', () => {
    const result = getErrorInfo(
      new ApiError(422, 'This patient has been restricted from scheduling appointments'),
    )
    expect(result.type).toBe('restricted')
  })

  it('joins field errors into the validation message when present', () => {
    const result = getErrorInfo(
      new ApiError(422, 'Invalid request', [
        { field: 'appointment_slot', message: 'must be a valid ISO 8601 date-time' },
      ]),
    )
    expect(result.type).toBe('validation')
    expect(result.message).toContain('appointment_slot')
    expect(result.message).toContain('must be a valid ISO 8601 date-time')
  })
})

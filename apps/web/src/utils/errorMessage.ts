import { ApiError } from './api'

export type ErrorType =
  | 'auth'
  | 'not-found'
  | 'conflict'
  | 'provider-mismatch'
  | 'restricted'
  | 'validation'
  | 'upstream'
  | 'generic'

export interface ErrorInfo {
  type: ErrorType
  message: string
}

// Messages the partner-scheduling-api documents for POST /v1/appointments (404/422).
// Matched by prefix since some messages vary by age group or role (e.g. "Provider is
// not willing to see children").
function bookingErrorInfo(message: string): ErrorInfo | null {
  if (message === 'Patient not found') {
    return { type: 'not-found', message: 'This patient could not be found.' }
  }
  if (message === 'Provider not found for requested appointment') {
    return {
      type: 'conflict',
      message: 'This provider is no longer available. Please pick another slot or provider.',
    }
  }
  if (message === 'Slot not found for requested appointment') {
    return {
      type: 'conflict',
      message: 'This slot is no longer available. Please pick another time.',
    }
  }
  if (message === 'Appointment time conflict') {
    return {
      type: 'conflict',
      message: 'This slot overlaps an existing appointment. Please pick another time.',
    }
  }
  if (message === 'Cannot create hold for time slot less than 25 hours in advance') {
    return {
      type: 'conflict',
      message: 'This slot is too soon to book. Please pick a time at least 25 hours out.',
    }
  }
  if (
    message.startsWith('Provider is not willing to see') ||
    message.includes('but appointment is for') ||
    message === "Provider does not take patient's insurance" ||
    message === 'Provider is not currently available to be booked'
  ) {
    return {
      type: 'provider-mismatch',
      message: 'This provider cannot take this appointment. Please choose a different provider.',
    }
  }
  if (message === 'This patient has been restricted from scheduling appointments') {
    return {
      type: 'restricted',
      message:
        'This patient is restricted from scheduling appointments. Please contact Rula support.',
    }
  }
  return null
}

export function getErrorInfo(err: unknown): ErrorInfo {
  if (!(err instanceof ApiError)) {
    return {
      type: 'generic',
      message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }

  if (err.status === 404 || err.status === 422) {
    const known = bookingErrorInfo(err.message)
    if (known) return known
  }

  switch (err.status) {
    case 401:
      return { type: 'auth', message: 'Session expired. Please log in again.' }
    case 404:
      return { type: 'not-found', message: 'The requested resource was not found.' }
    case 422:
      if (err.errors?.length) {
        return {
          type: 'validation',
          message: err.errors.map((e) => `${e.field}: ${e.message}`).join('; '),
        }
      }
      return {
        type: 'validation',
        message: err.message || 'The request could not be processed. Please check your input.',
      }
    case 502:
      return {
        type: 'upstream',
        message: 'The partner API is temporarily unavailable. Please try again.',
      }
    default:
      return { type: 'generic', message: `Request failed (${err.status}).` }
  }
}

import { ApiError } from './api'

export type ErrorType = 'auth' | 'not-found' | 'conflict' | 'validation' | 'upstream' | 'generic'

export interface ErrorInfo {
  type: ErrorType
  message: string
}

export function getErrorInfo(err: unknown): ErrorInfo {
  if (!(err instanceof ApiError)) {
    return {
      type: 'generic',
      message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
  switch (err.status) {
    case 401:
      return { type: 'auth', message: 'Session expired. Please log in again.' }
    case 404:
      return { type: 'not-found', message: 'The requested resource was not found.' }
    case 409:
      return {
        type: 'conflict',
        message: 'This slot is no longer available. Please pick another time.',
      }
    case 422:
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

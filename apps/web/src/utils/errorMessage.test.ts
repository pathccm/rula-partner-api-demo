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

  it('maps 404 → not-found', () => {
    const result = getErrorInfo(new ApiError(404, 'Not Found'))
    expect(result.type).toBe('not-found')
  })

  it('maps 409 → conflict', () => {
    const result = getErrorInfo(new ApiError(409, 'Conflict'))
    expect(result.type).toBe('conflict')
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

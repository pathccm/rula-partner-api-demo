export interface PartnerApiErrorDetail {
  field: string
  message: string
}

export class PartnerApiError extends Error {
  readonly status: number
  readonly errors?: PartnerApiErrorDetail[]
  constructor(status: number, message: string, errors?: PartnerApiErrorDetail[]) {
    super(message)
    this.name = 'PartnerApiError'
    this.status = status
    this.errors = errors
  }
}

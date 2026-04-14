export class PartnerApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PartnerApiError'
    this.status = status
  }
}

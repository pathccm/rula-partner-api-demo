import type { ErrorInfo } from '../utils/errorMessage'

interface ErrorBannerProps {
  error: ErrorInfo
  onDismiss?: () => void
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div className={`error-banner error-banner--${error.type}`} role="alert">
      <span>{error.message}</span>
      {error.type === 'conflict' && onDismiss && (
        <button type="button" className="error-action" onClick={onDismiss}>
          Pick another slot
        </button>
      )}
      {error.type === 'provider-mismatch' && onDismiss && (
        <button type="button" className="error-action" onClick={onDismiss}>
          Pick another provider
        </button>
      )}
      {error.type === 'upstream' && onDismiss && (
        <button type="button" className="error-action" onClick={onDismiss}>
          Retry
        </button>
      )}
    </div>
  )
}

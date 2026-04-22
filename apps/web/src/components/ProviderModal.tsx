import { useEffect } from 'react'
import type { Provider, ProviderDetail } from '../utils/api'

interface ProviderModalProps {
  provider: Provider
  detail: ProviderDetail | null
  loading: boolean
  onClose: () => void
  onViewSlots: () => void
}

export function ProviderModal({
  provider,
  detail,
  loading,
  onClose,
  onViewSlots,
}: ProviderModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sections = detail
    ? [
        { title: 'About', text: detail.profile_bio ?? detail.profile_summary },
        { title: 'Approach', text: detail.profile_approach },
        { title: 'Areas of focus', text: detail.profile_focus },
        { title: 'My journey', text: detail.profile_journey },
        { title: 'Goals for patients', text: detail.profile_goals },
        { title: 'What to expect in the first session', text: detail.profile_first_session },
      ].filter((s) => s.text)
    : []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Close modal"
      />
      <div className="modal" role="document" onKeyDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal-header">
          <div className="modal-avatar">
            {provider.first_name[0]}
            {provider.last_name[0]}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.35rem' }}>
              {provider.first_name} {provider.last_name}
            </h2>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {detail?.role_string && <span className="specialty">{detail.role_string}</span>}
              {detail?.active_states?.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
              {!detail &&
                provider.genders?.map((g) => (
                  <span key={g} className="tag">
                    {g}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="modal-body">
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading profile…</p>}

          {!loading && detail && (
            <>
              {sections.map((s) => (
                <div key={s.title} className="modal-section">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}

              {detail.insurances && detail.insurances.length > 0 && (
                <div className="modal-section">
                  <h3>Accepted insurance</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {detail.insurances.map((ins) => (
                      <span key={ins} className="tag">
                        {ins}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.willing_to_see && detail.willing_to_see.length > 0 && (
                <div className="modal-section">
                  <h3>Sees</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {detail.willing_to_see.map((w) => (
                      <span key={w} className="tag" style={{ textTransform: 'capitalize' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onViewSlots}>
            View available slots
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Back to providers
          </button>
        </div>
      </div>
    </div>
  )
}

export function BookingModal() {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Booking in progress">
      <div className="modal booking-modal">
        <div className="booking-spinner" />
        <h2 style={{ margin: '0 0 0.4rem' }}>Booking your appointment…</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          We're reserving your slot. This will just take a moment.
        </p>
      </div>
    </div>
  )
}

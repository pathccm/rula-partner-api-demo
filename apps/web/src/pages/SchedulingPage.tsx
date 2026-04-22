import { useEffect, useState } from 'react'
import { BookingModal } from '../components/BookingModal'
import { ErrorBanner } from '../components/ErrorBanner'
import { ProviderModal } from '../components/ProviderModal'
import type {
  Appointment,
  AppointmentStatus,
  Insurance,
  Provider,
  ProviderDetail,
  Slot,
} from '../utils/api'
import { api } from '../utils/api'
import { type ErrorInfo, getErrorInfo } from '../utils/errorMessage'

type Step = 'careType' | 'insurance' | 'providers' | 'slots' | 'patient' | 'confirmed' | 'status'

const STEP_LABELS: Record<Step, string> = {
  careType: '1. Care type',
  insurance: '2. Insurance',
  providers: '3. Providers',
  slots: '4. Slots',
  patient: '5. Patient',
  confirmed: '6. Confirmed',
  status: '7. Status',
}

const CARE_TYPES = [
  { value: 'Individual', icon: '🧠', label: 'Individual therapy' },
  { value: 'Couples', icon: '💑', label: 'Couples therapy' },
  { value: 'Family', icon: '👨‍👩‍👧', label: 'Family therapy' },
  { value: 'Psychiatry', icon: '💊', label: 'Psychiatry' },
]

const LOCATION_TYPES = [
  { value: 'telemedicine', icon: '💻', label: 'Video' },
  { value: 'in_person', icon: '🏢', label: 'In person' },
]

const US_STATES = ['CA', 'CO', 'FL', 'IL', 'MA', 'NY', 'OR', 'PA', 'TX', 'WA']

const EMPTY_PATIENT = {
  partner_patient_id: 'demo-patient-001',
  first_name: '',
  last_name: '',
  phone_number: '',
  email: '',
  date_of_birth: '',
  location: 'CA',
}

const STEP_ORDER: Step[] = [
  'careType',
  'insurance',
  'providers',
  'slots',
  'patient',
  'confirmed',
  'status',
]

export function SchedulingPage() {
  const [step, setStep] = useState<Step>('careType')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorInfo | null>(null)

  // Step 1
  const [careType, setCareType] = useState<string | null>(null)
  const [locationType, setLocationType] = useState<'telemedicine' | 'in_person' | null>(null)
  const [state, setState] = useState('CA')

  // Step 2
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null)

  // Step 3
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerPage, setProviderPage] = useState(0)
  const PROVIDERS_PER_PAGE = 10
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [booking, setBooking] = useState(false)
  const [modalProvider, setModalProvider] = useState<Provider | null>(null)
  const [modalDetail, setModalDetail] = useState<ProviderDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Step 4
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  // Step 5
  const [patientData, setPatientData] = useState(EMPTY_PATIENT)

  // Step 6
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)

  // Step 7
  const [appointmentStatuses, setAppointmentStatuses] = useState<AppointmentStatus[]>([])

  function handleError(err: unknown) {
    setError(getErrorInfo(err))
  }

  // Load insurances when moving to insurance step
  useEffect(() => {
    if (step !== 'insurance') return
    async function load() {
      setLoading(true)
      setInsurances([])
      try {
        const res = await api.getInsurances(state)
        setInsurances(res.insurances)
      } catch (err) {
        setError(getErrorInfo(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [step, state])

  async function handleSelectInsurance(ins: Insurance | null) {
    setSelectedInsurance(ins)
    setError(null)
    setLoading(true)
    setProviderPage(0)
    try {
      const res = await api.searchProviders({
        two_letter_state: state,
        insurance: ins?.network_name,
        care_category: careType === 'Psychiatry' ? 'psychiatry' : 'therapy',
        limit: 50,
      })
      setProviders(res.providers)
      setStep('providers')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenModal(provider: Provider) {
    setModalProvider(provider)
    setModalDetail(null)
    setModalLoading(true)
    try {
      const detail = await api.getProviderDetail(provider.id)
      setModalDetail(detail)
    } catch (err) {
      handleError(err)
    } finally {
      setModalLoading(false)
    }
  }

  function handleCloseModal() {
    setModalProvider(null)
    setModalDetail(null)
  }

  async function handleSelectProvider(provider: Provider) {
    setSelectedProvider(provider)
    setError(null)
    setLoading(true)
    try {
      const res = await api.getSlots(provider.id, state, locationType)
      setSlots(res.slots)
      setStep('slots')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot)
    setError(null)
    setStep('patient')
  }

  async function handleBook(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedProvider || !selectedSlot || !careType) return
    setError(null)
    setBooking(true)
    try {
      const patient = await api.createPatient(patientData)
      const appt = await api.bookAppointment({
        patient_id: patient.patient_id,
        provider_id: selectedProvider.id,
        appointment_slot: selectedSlot.start_time_iso,
        appointment_details: {
          is_virtual: selectedSlot.location === 'telemedicine',
          appointment_type: careType as
            | 'Individual'
            | 'Couples'
            | 'Family'
            | '15 min Consult'
            | 'Psychiatry',
          two_letter_state: state,
        },
      })
      setAppointment(appt)
      setPatientId(patient.patient_id)
      setStep('confirmed')
    } catch (err) {
      handleError(err)
    } finally {
      setBooking(false)
    }
  }

  async function handleViewStatus() {
    if (!patientId) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.getPatientAppointments(patientId)
      setAppointmentStatuses(res.appointments)
      setStep('status')
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('careType')
    setCareType(null)
    setLocationType(null)
    setState('CA')
    setInsurances([])
    setSelectedInsurance(null)
    setProviders([])
    setSelectedProvider(null)
    setSlots([])
    setSelectedSlot(null)
    setPatientData(EMPTY_PATIENT)
    setAppointment(null)
    setPatientId(null)
    setAppointmentStatuses([])
    setError(null)
  }

  const currentIdx = STEP_ORDER.indexOf(step)

  return (
    <div className="scheduling-page">
      <div className="step-indicator">
        {STEP_ORDER.map((s, i) => (
          <span
            key={s}
            className={`step ${step === s ? 'active' : ''} ${i < currentIdx ? 'done' : ''}`}
          >
            {i < currentIdx ? '✓' : STEP_LABELS[s]}
          </span>
        ))}
      </div>

      {error && (
        <ErrorBanner
          error={error}
          onDismiss={
            error.type === 'conflict'
              ? () => setStep('slots')
              : error.type === 'upstream'
                ? () => setError(null)
                : undefined
          }
        />
      )}

      {/* Step 1 — Care type + state */}
      {step === 'careType' && (
        <div className="card">
          <h2>What kind of care are you looking for?</h2>
          <div className="option-grid">
            {CARE_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                className={`option-card ${careType === ct.value ? 'selected' : ''}`}
                onClick={() => setCareType(ct.value)}
              >
                <span className="option-icon">{ct.icon}</span>
                {ct.label}
              </button>
            ))}
          </div>

          <h2 style={{ marginTop: '1.5rem' }}>Session format</h2>
          <div className="option-grid">
            {LOCATION_TYPES.map((lt) => (
              <button
                key={lt.value}
                type="button"
                className={`option-card ${locationType === lt.value ? 'selected' : ''}`}
                onClick={() => setLocationType(lt.value as 'telemedicine' | 'in_person')}
              >
                <span className="option-icon">{lt.icon}</span>
                {lt.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', maxWidth: 260 }}>
            <label className="search-form" style={{ gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Your state</span>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={!careType}
              onClick={() => {
                setError(null)
                setStep('insurance')
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Insurance */}
      {step === 'insurance' && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('careType')}>
            ← Back
          </button>
          <h2>What's your insurance?</h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              marginTop: 0,
              marginBottom: '1.25rem',
            }}
          >
            Select your plan to see in-network providers, or continue without insurance.
          </p>
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading plans…</p>}
          {!loading && insurances.length > 0 && (
            <div className="search-form">
              <label>
                Insurance plan
                <select
                  value={selectedInsurance?.id ?? ''}
                  onChange={(e) => {
                    const ins = insurances.find((i) => i.id === e.target.value) ?? null
                    setSelectedInsurance(ins)
                  }}
                >
                  <option value="">Select a plan…</option>
                  {insurances.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.carrier_display_name}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selectedInsurance}
                  onClick={() => handleSelectInsurance(selectedInsurance)}
                >
                  Continue
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleSelectInsurance(null)}
                >
                  Pay out of pocket
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Provider results */}
      {step === 'providers' && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('insurance')}>
            ← Back
          </button>
          <h2>Available providers</h2>
          {selectedInsurance && (
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                marginTop: 0,
                marginBottom: '1rem',
              }}
            >
              Showing in-network providers for{' '}
              <strong>{selectedInsurance.carrier_display_name}</strong> in <strong>{state}</strong>
            </p>
          )}
          {providers.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No providers found</h3>
              <p>
                We couldn't find any in-network providers for{' '}
                {selectedInsurance ? (
                  <>
                    <strong>{selectedInsurance.carrier_display_name}</strong> in{' '}
                    <strong>{state}</strong>
                  </>
                ) : (
                  <strong>{state}</strong>
                )}
                .
              </p>
              <p>Try going back and selecting a different insurance plan or state.</p>
              <div className="empty-state-support">
                <span>Need help finding care?</span>
                <a href="mailto:support@rula.com">Contact support</a>
              </div>
            </div>
          )}
          <ul className="provider-list">
            {providers
              .slice(providerPage * PROVIDERS_PER_PAGE, (providerPage + 1) * PROVIDERS_PER_PAGE)
              .map((p) => (
                <li key={p.id}>
                  <div className="provider-card">
                    <div className="provider-card-info">
                      <p className="provider-card-name">
                        {p.first_name} {p.last_name}
                      </p>
                      <div className="provider-card-meta">
                        {p.slot_start_time && (
                          <span className="info-pill">
                            <span className="info-pill-label">Next availability</span>
                            {new Date(p.slot_start_time).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      {p.profile_bio && <p className="provider-card-bio">{p.profile_bio}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-ghost small"
                        onClick={() => handleOpenModal(p)}
                      >
                        About
                      </button>
                      <button
                        type="button"
                        className="btn-primary small"
                        onClick={() => handleSelectProvider(p)}
                        disabled={loading}
                      >
                        {loading && selectedProvider?.id === p.id ? 'Loading…' : 'View slots'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
          {providers.length > PROVIDERS_PER_PAGE && (
            <div className="pagination">
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => setProviderPage((p) => p - 1)}
                disabled={providerPage === 0}
              >
                ← Prev
              </button>
              <span className="pagination-label">
                {providerPage + 1} / {Math.ceil(providers.length / PROVIDERS_PER_PAGE)}
              </span>
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => setProviderPage((p) => p + 1)}
                disabled={(providerPage + 1) * PROVIDERS_PER_PAGE >= providers.length}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {booking && <BookingModal />}

      {modalProvider && (
        <ProviderModal
          provider={modalProvider}
          detail={modalDetail}
          loading={modalLoading}
          onClose={handleCloseModal}
          onViewSlots={() => {
            handleCloseModal()
            handleSelectProvider(modalProvider)
          }}
        />
      )}

      {/* Step 4 — Slots */}
      {step === 'slots' && selectedProvider && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('providers')}>
            ← Back
          </button>
          <h2>
            {selectedProvider.first_name} {selectedProvider.last_name}
          </h2>
          {selectedProvider.genders && selectedProvider.genders.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <span className="tag">{selectedProvider.genders.join(', ')}</span>
            </div>
          )}
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading slots…</p>}
          {slots.length === 0 && !loading && (
            <p style={{ color: 'var(--text-secondary)' }}>No upcoming slots available.</p>
          )}
          {slots.length > 0 && (
            <>
              <p
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                }}
              >
                Select a time that works for you
              </p>
              <ul className="slot-list">
                {slots.map((slot) => (
                  <li key={`${slot.start_time_iso}-${slot.location}`} className="slot-item">
                    <div className="slot-item-info">
                      <strong className="slot-item-time">
                        {new Date(slot.start_time_iso).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </strong>
                      <span className="tag slot-item-location">
                        {slot.location === 'telemedicine' ? 'Video' : 'In person'}
                      </span>
                      <span className="tag slot-item-duration">{slot.duration_mins} min</span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary small"
                      onClick={() => handleSelectSlot(slot)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Step 5 — Patient form */}
      {step === 'patient' && selectedSlot && selectedProvider && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('slots')}>
            ← Back
          </button>
          <h2>Your information</h2>
          <div className="selected-slot">
            <strong>
              {selectedProvider.first_name} {selectedProvider.last_name}
            </strong>
            {' · '}
            {new Date(selectedSlot.start_time_iso).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {' · '}
            {selectedSlot.location === 'telemedicine' ? 'Video' : 'In person'}
          </div>
          <form onSubmit={handleBook} className="search-form">
            <label>
              First name
              <input
                type="text"
                placeholder="Jane"
                value={patientData.first_name}
                onChange={(e) => setPatientData((d) => ({ ...d, first_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Last name
              <input
                type="text"
                placeholder="Doe"
                value={patientData.last_name}
                onChange={(e) => setPatientData((d) => ({ ...d, last_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Date of birth
              <input
                type="date"
                value={patientData.date_of_birth}
                onChange={(e) => setPatientData((d) => ({ ...d, date_of_birth: e.target.value }))}
                required
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                placeholder="(555) 000-0001"
                value={patientData.phone_number}
                onChange={(e) => setPatientData((d) => ({ ...d, phone_number: e.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                placeholder="jane.doe@example.com"
                value={patientData.email}
                onChange={(e) => setPatientData((d) => ({ ...d, email: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
              Confirm appointment
            </button>
          </form>
        </div>
      )}

      {/* Step 6 — Confirmed */}
      {step === 'confirmed' && appointment && (
        <div className="card">
          <div className="confirmation">
            <div className="checkmark">✓</div>
            <h2 style={{ margin: 0 }}>You're booked!</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
              Your appointment has been confirmed.
            </p>
            <div className="appt-details">
              <p>
                <strong>Confirmation ID:</strong> {appointment.appointment_id}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {new Date(appointment.appointment_slot).toLocaleString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <p>
                <strong>Type:</strong> {appointment.appointment_details.appointment_type}
              </p>
              <p>
                <strong>Format:</strong>{' '}
                {appointment.appointment_details.is_virtual ? 'Video' : 'In person'}
              </p>
              <p>
                <strong>Status:</strong> {appointment.status}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={handleViewStatus}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Loading…' : 'View appointment status'}
              </button>
              <button type="button" onClick={reset} className="btn-ghost">
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 7 — Status */}
      {step === 'status' && (
        <div className="card">
          <h2>Appointment status</h2>
          {appointmentStatuses.length === 0 && !loading && (
            <p style={{ color: 'var(--text-secondary)' }}>No appointments found.</p>
          )}
          <ul className="slot-list">
            {appointmentStatuses.map((appt) => (
              <li key={appt.appointment_id} className="slot-item">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}
                >
                  <strong style={{ fontSize: '0.92rem' }}>
                    {new Date(appt.start_time).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </strong>
                  <span className={`tag tag--${appt.status}`}>{appt.status}</span>
                  <span className="tag">
                    {appt.appointment_type === 'telemedicine' ? 'Video' : 'In person'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={reset}
            className="btn-primary"
            style={{ marginTop: '1.25rem' }}
          >
            Start over
          </button>
        </div>
      )}
    </div>
  )
}

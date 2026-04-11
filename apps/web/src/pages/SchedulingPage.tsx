import { useCallback, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { Appointment, Provider, Slot } from '../utils/api'
import { api } from '../utils/api'

type Step = 'search' | 'slots' | 'patient' | 'confirmed'

const US_STATES = ['CA', 'NY', 'TX', 'FL', 'WA', 'OR', 'CO', 'IL', 'MA', 'PA']

export function SchedulingPage() {
  const { getAccessTokenSilently } = useAuth()
  const [step, setStep] = useState<Step>('search')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search form
  const [state, setState] = useState('CA')
  const [insurance, setInsurance] = useState('')
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  // Slots
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  // Patient form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  // Result
  const [appointment, setAppointment] = useState<Appointment | null>(null)

  const getToken = useCallback(async () => {
    return getAccessTokenSilently()
  }, [getAccessTokenSilently])

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await getToken()
      const results = await api.searchProviders(
        { state, insurance_carrier_name: insurance || undefined },
        token,
      )
      setProviders(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectProvider(provider: Provider) {
    setSelectedProvider(provider)
    setError(null)
    setLoading(true)
    try {
      const token = await getToken()
      const results = await api.getSlots(provider.uuid, state, token)
      setSlots(results)
      setStep('slots')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slots')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot)
    setStep('patient')
  }

  async function handleBook(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedProvider || !selectedSlot) return
    setError(null)
    setLoading(true)
    try {
      const token = await getToken()
      const patient = await api.createPatient(
        { first_name: firstName, last_name: lastName, email },
        token,
      )
      const appt = await api.bookAppointment(
        {
          provider_uuid: selectedProvider.uuid,
          patient_uuid: patient.uuid,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          appointment_type: selectedSlot.appointment_type,
        },
        token,
      )
      setAppointment(appt)
      setStep('confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('search')
    setProviders([])
    setSelectedProvider(null)
    setSlots([])
    setSelectedSlot(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setAppointment(null)
    setError(null)
  }

  return (
    <div className="scheduling-page">
      <div className="step-indicator">
        {(['search', 'slots', 'patient', 'confirmed'] as Step[]).map((s, i) => (
          <span key={s} className={`step ${step === s ? 'active' : ''}`}>
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {step === 'search' && (
        <div className="card">
          <h2>Find a Provider</h2>
          <form onSubmit={handleSearch} className="search-form">
            <label>
              State
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Insurance (optional)
              <input
                type="text"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder="e.g. Aetna"
              />
            </label>
            <button type="submit" disabled={loading} className="auth-button login-button">
              {loading ? 'Searching…' : 'Search Providers'}
            </button>
          </form>

          {providers.length > 0 && (
            <div className="results">
              <h3>Results ({providers.length})</h3>
              <ul className="provider-list">
                {providers.map((p) => (
                  <li key={p.uuid} className="provider-item">
                    <div>
                      <strong>
                        {p.first_name} {p.last_name}
                      </strong>
                      <span className="specialty">{p.specialty}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectProvider(p)}
                      className="auth-button login-button small"
                    >
                      View Slots
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === 'slots' && selectedProvider && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('search')}>
            ← Back
          </button>
          <h2>
            Available Slots — {selectedProvider.first_name} {selectedProvider.last_name}
          </h2>
          {loading && <p>Loading slots…</p>}
          {slots.length === 0 && !loading && <p>No slots available.</p>}
          <ul className="slot-list">
            {slots.map((slot) => (
              <li key={`${slot.start_time}-${slot.appointment_type}`} className="slot-item">
                <div>
                  <strong>{new Date(slot.start_time).toLocaleString()}</strong>
                  <span className="tag">{slot.appointment_type.replace('_', ' ')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectSlot(slot)}
                  className="auth-button login-button small"
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'patient' && selectedSlot && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('slots')}>
            ← Back
          </button>
          <h2>Patient Information</h2>
          <p className="selected-slot">
            Booking:{' '}
            <strong>
              {new Date(selectedSlot.start_time).toLocaleString()} (
              {selectedSlot.appointment_type.replace('_', ' ')})
            </strong>
          </p>
          <form onSubmit={handleBook} className="search-form">
            <label>
              First Name
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading} className="auth-button login-button">
              {loading ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      )}

      {step === 'confirmed' && appointment && (
        <div className="card">
          <div className="confirmation">
            <div className="checkmark">✓</div>
            <h2>Appointment Confirmed!</h2>
            <div className="appt-details">
              <p>
                <strong>Confirmation ID:</strong> {appointment.uuid}
              </p>
              <p>
                <strong>Date:</strong> {new Date(appointment.start_time).toLocaleString()}
              </p>
              <p>
                <strong>Type:</strong> {appointment.appointment_type.replace('_', ' ')}
              </p>
              <p>
                <strong>Status:</strong> {appointment.status}
              </p>
            </div>
            <button type="button" onClick={reset} className="auth-button login-button">
              Book Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

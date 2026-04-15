import { useCallback, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { Appointment, Provider, Slot } from '../utils/api'
import { api } from '../utils/api'

type Step = 'search' | 'slots' | 'patient' | 'confirmed'

const US_STATES = ['CA', 'NY', 'TX', 'FL', 'WA', 'OR', 'CO', 'IL', 'MA', 'PA']

// Pre-filled demo values — real data must never be entered here
const DEMO_PATIENT = {
  partner_patient_id: 'demo-patient-001',
  first_name: 'Demo',
  last_name: 'Patient',
  phone_number: '5550000001',
  email: 'demo.patient@example.com',
  date_of_birth: '1990-01-01',
  location: 'CA',
}

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

  // Patient form (pre-filled with demo values)
  const [patientData, setPatientData] = useState(DEMO_PATIENT)

  // Result
  const [appointment, setAppointment] = useState<Appointment | null>(null)

  const getToken = useCallback(async () => getAccessTokenSilently(), [getAccessTokenSilently])

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await getToken()
      const res = await api.searchProviders(
        { two_letter_state: state, insurance: insurance || undefined },
        token,
      )
      setProviders(res.providers)
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
      const res = await api.getSlots(provider.provider_id, state, token)
      setSlots(res.slots)
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
      const patient = await api.createPatient(patientData, token)
      const appt = await api.bookAppointment(
        {
          patient_id: patient.patient_id,
          provider_id: selectedProvider.provider_id,
          appointment_slot: selectedSlot.start_time_iso,
          appointment_details: {
            is_virtual: selectedSlot.location === 'telemedicine',
            appointment_type: 'Individual',
            two_letter_state: state,
          },
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
    setPatientData(DEMO_PATIENT)
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
                  <li key={p.provider_id} className="provider-item">
                    <div>
                      <strong>
                        {p.first_name} {p.last_name}
                      </strong>
                      {p.specialty && <span className="specialty">{p.specialty}</span>}
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
              <li key={`${slot.start_time_iso}-${slot.location}`} className="slot-item">
                <div>
                  <strong>{new Date(slot.start_time_iso).toLocaleString()}</strong>
                  <span className="tag">{slot.location.replace('_', ' ')}</span>
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
          <p className="disclaimer-inline">
            Demo only — do not enter real patient data. Form is pre-filled with fake demo values.
          </p>
          <p className="selected-slot">
            Booking:{' '}
            <strong>
              {new Date(selectedSlot.start_time_iso).toLocaleString()} (
              {selectedSlot.location.replace('_', ' ')})
            </strong>
          </p>
          <form onSubmit={handleBook} className="search-form">
            <label>
              First Name
              <input
                type="text"
                value={patientData.first_name}
                onChange={(e) => setPatientData((d) => ({ ...d, first_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                value={patientData.last_name}
                onChange={(e) => setPatientData((d) => ({ ...d, last_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Date of Birth
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
                value={patientData.phone_number}
                onChange={(e) => setPatientData((d) => ({ ...d, phone_number: e.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={patientData.email}
                onChange={(e) => setPatientData((d) => ({ ...d, email: e.target.value }))}
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
                <strong>Confirmation ID:</strong> {appointment.appointment_id}
              </p>
              <p>
                <strong>Date:</strong> {new Date(appointment.appointment_slot).toLocaleString()}
              </p>
              <p>
                <strong>Type:</strong> {appointment.appointment_details.appointment_type}
              </p>
              <p>
                <strong>Format:</strong>{' '}
                {appointment.appointment_details.is_virtual ? 'Telemedicine' : 'In person'}
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

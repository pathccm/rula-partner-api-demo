import { useEffect, useRef, useState } from 'react'
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

type Step =
  | 'careType'
  | 'insurance'
  | 'filters'
  | 'providers'
  | 'slots'
  | 'patient'
  | 'confirmed'
  | 'status'

// ─── Constants ───────────────────────────────────────────────────────────────

const CARE_TYPES = [
  { value: 'Individual', label: 'Therapy' },
  { value: 'Psychiatry', label: 'Medication management' },
]

const LOCATION_TYPES = [
  { value: 'telemedicine', label: 'Virtual' },
  { value: 'in_person', label: 'In-person' },
]

const US_STATES = ['CA', 'MB', 'TN']

const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Tagalog',
  'Vietnamese',
  'Arabic',
  'French',
  'Korean',
  'Russian',
  'Hindi',
  'Portuguese',
  'Hmong',
  'Farsi',
  'Armenian',
  'ASL',
  'Bengali',
  'Punjabi',
  'Japanese',
  'Urdu',
  'Haitian Creole',
  'Polish',
  'Italian',
  'German',
  'Bosnian',
  'Ukrainian',
  'Romanian',
  'Greek',
  'Turkish',
  'Hebrew',
  'Swahili',
  'Yoruba',
  'Thai',
  'Indonesian',
  'Javanese',
  'Dutch',
  'Hungarian',
  'Czech',
  'Swedish',
  'Norwegian',
  'Afrikaans',
  'Patois',
  'Iranian',
  'Other',
  "My selection isn't listed",
] as const

const GENDER_OPTIONS = [
  'Female',
  'Male',
  'Trans',
  'Non-binary',
  'Gender fluid',
  'Agender',
  'Bigender',
  'Cis',
  "My gender isn't listed",
  'Prefer not to respond',
] as const

const RACE_OPTIONS = [
  'American Indian or Alaska Native',
  'Asian',
  'Biracial or Multiracial',
  'Black or African American',
  'Caucasian or White',
  'Hispanic or Latinx',
  'Middle Eastern',
  'Native Hawaiian or Other Pacific Islander',
  'South East Asian',
  'Other',
  'Prefer Not to Respond',
] as const

const SPECIALIZATION_OPTIONS = [
  'Anxiety',
  'Depression',
  'Trauma and PTSD',
  'Relationship Issues',
  'Grief',
  'ADHD',
  'Bipolar Disorder',
  'Eating Disorders',
  'LGBTQIA+',
  'Life Transitions',
  'Addiction',
  'Anger Management',
  'Coping Skills',
  'Family Conflict',
  'Self Esteem',
  'Stress',
  'Sleep or Insomnia',
  'Chronic Illness',
  'Chronic Pain',
  'Pregnancy, Prenatal, Postpartum',
] as const

const PROVIDERS_PER_PAGE = 10

const EMPTY_PATIENT = {
  partner_patient_id: 'demo-patient-001',
  first_name: '',
  last_name: '',
  phone_number: '',
  email: '',
  date_of_birth: '',
  location: 'CA',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupSlotsByDate(slots: Slot[]): Record<string, Slot[]> {
  return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = new Date(slot.start_time_iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderAvatar({
  provider,
  size = 'sm',
}: {
  provider: Pick<Provider, 'first_name' | 'last_name' | 'profile_image_url'>
  size?: 'sm' | 'lg'
}) {
  return (
    <div className={`provider-card-avatar ${size === 'lg' ? 'provider-card-avatar--lg' : ''}`}>
      {provider.profile_image_url ? (
        <img
          src={provider.profile_image_url}
          alt={`${provider.first_name} ${provider.last_name}`}
          className="provider-card-img"
        />
      ) : (
        <span>
          {provider.first_name[0]}
          {provider.last_name[0]}
        </span>
      )}
    </div>
  )
}

function FilterChipGroup<T extends string>({
  id,
  options,
  selected,
  initialCount = 4,
  expandedId,
  onExpand,
  onToggle,
}: {
  id: string
  options: readonly T[]
  selected: string[]
  initialCount?: number
  expandedId: string | null
  onExpand: (id: string | null) => void
  onToggle: (v: T) => void
}) {
  const isExpanded = expandedId === id
  const visible = isExpanded ? options : options.slice(0, initialCount)
  const hiddenCount = options.length - initialCount
  const hiddenSelected = options.slice(initialCount).filter((o) => selected.includes(o)).length

  return (
    <div className="filter-chip-grid">
      {visible.map((o) => (
        <button
          key={o}
          type="button"
          className={`filter-chip ${selected.includes(o) ? 'selected' : ''}`}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
      {!isExpanded && hiddenCount > 0 && (
        <button
          type="button"
          className="filter-chip filter-chip--more"
          onClick={() => onExpand(id)}
        >
          +{hiddenCount} more{hiddenSelected > 0 ? ` (${hiddenSelected} selected)` : ''}
        </button>
      )}
      {isExpanded && (
        <button
          type="button"
          className="filter-chip filter-chip--more"
          onClick={() => onExpand(null)}
        >
          Show less
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SchedulingPage() {
  const [step, setStep] = useState<Step>('careType')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorInfo | null>(null)

  // Step 1
  const [careType, setCareType] = useState<string | null>(null)
  const [locationTypes, setLocationTypes] = useState<Array<'telemedicine' | 'in_person'>>([])
  const [state, setState] = useState('CA')

  // Step 1 — state dropdown
  const [stateOpen, setStateOpen] = useState(false)
  const stateRef = useRef<HTMLDivElement>(null)

  // Step 2
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null)
  const [subscriberId, setSubscriberId] = useState('')
  const [insuranceQuery, setInsuranceQuery] = useState('')
  const [insuranceOpen, setInsuranceOpen] = useState(false)
  const insuranceRef = useRef<HTMLDivElement>(null)

  // Step 3 — provider filters
  const [filterLanguages, setFilterLanguages] = useState<Array<(typeof LANGUAGE_OPTIONS)[number]>>([])
  const [filterGenders, setFilterGenders] = useState<Array<(typeof GENDER_OPTIONS)[number]>>([])
  const [filterRaces, setFilterRaces] = useState<Array<(typeof RACE_OPTIONS)[number]>>([])
  const [filterSpecializations, setFilterSpecializations] = useState<
    Array<(typeof SPECIALIZATION_OPTIONS)[number]>
  >([])
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)

  // Step 4 — Provider results
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerPage, setProviderPage] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [booking, setBooking] = useState(false)
  const [modalProvider, setModalProvider] = useState<Provider | null>(null)
  const [modalDetail, setModalDetail] = useState<ProviderDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Step 5 — Slot selection
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  // Step 6 — Patient info
  const [patientData, setPatientData] = useState(EMPTY_PATIENT)

  // Step 7 — Confirmation
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)

  // Step 8 — Appointment status
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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (insuranceRef.current && !insuranceRef.current.contains(e.target as Node)) {
        setInsuranceOpen(false)
      }
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectInsurance(ins: Insurance | null) {
    setSelectedInsurance(ins)
    setError(null)
    setStep('filters')
  }

  type SearchProviderParams = Parameters<typeof api.searchProviders>[0]

  async function handleApplyFilters(filters?: {
    language?: SearchProviderParams['language']
    gender?: SearchProviderParams['gender']
    race?: SearchProviderParams['race']
    specialization?: SearchProviderParams['specialization']
  }) {
    setError(null)
    setLoading(true)
    setProviderPage(0)
    try {
      const res = await api.searchProviders({
        two_letter_state: state,
        insurance: selectedInsurance?.network_name,
        care_category: careType === 'Psychiatry' ? 'psychiatry' : 'therapy',
        limit: 50,
        ...filters,
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
      const locationFilter = locationTypes.length === 1 ? locationTypes[0] : null
      const res = await api.getSlots(provider.id, state, locationFilter)
      setSlots(res.slots)
      const firstDate = Object.keys(groupSlotsByDate(res.slots))[0] ?? null
      setExpandedDate(firstDate)
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
      const patient = await api.createPatient({
        ...patientData,
        location: state,
        care_types: [careType],
        is_eap_referral: false,
        ...(selectedInsurance && {
          insurance_id: selectedInsurance.id,
          subscriber_id: subscriberId,
        }),
      })
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
    setLocationTypes([])
    setState('CA')
    setStateOpen(false)
    setInsurances([])
    setSelectedInsurance(null)
    setInsuranceQuery('')
    setInsuranceOpen(false)
    setFilterLanguages([])
    setFilterGenders([])
    setFilterRaces([])
    setFilterSpecializations([])
    setExpandedFilter(null)
    setProviders([])
    setSelectedProvider(null)
    setSlots([])
    setSelectedSlot(null)
    setExpandedDate(null)
    setPatientData(EMPTY_PATIENT)
    setAppointment(null)
    setPatientId(null)
    setAppointmentStatuses([])
    setError(null)
  }

  return (
    <div className="scheduling-page">
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
          <h2 style={{ whiteSpace: 'nowrap' }}>What type of care are you looking for?</h2>
          <div className="option-grid">
            {CARE_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                className={`option-card ${careType === ct.value ? 'selected' : ''}`}
                onClick={() => setCareType(ct.value)}
              >
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
                className={`option-card ${locationTypes.includes(lt.value as 'telemedicine' | 'in_person') ? 'selected' : ''}`}
                onClick={() => {
                  const v = lt.value as 'telemedicine' | 'in_person'
                  setLocationTypes((prev) =>
                    prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
                  )
                }}
              >
                {lt.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', maxWidth: 260 }}>
            <div className="ins-dropdown" ref={stateRef}>
              <h2 style={{ margin: '0 0 0.4rem' }}>Your state</h2>
              <button
                type="button"
                className={`ins-dropdown-trigger ${stateOpen ? 'open' : ''}`}
                onClick={() => setStateOpen((o) => !o)}
              >
                <span>{state}</span>
                <span className={`ins-chevron ${stateOpen ? 'open' : ''}`} />
              </button>
              {stateOpen && (
                <div className="ins-dropdown-panel">
                  <ul className="ins-option-list">
                    {US_STATES.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          className={`ins-option ${state === s ? 'selected' : ''}`}
                          onClick={() => {
                            if (s !== state) {
                              setSelectedInsurance(null)
                              setProviders([])
                              setSelectedProvider(null)
                            }
                            setState(s)
                            setStateOpen(false)
                          }}
                        >
                          {s}
                          {state === s && <span className="ins-check" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={!careType || locationTypes.length === 0}
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
              <div className="ins-dropdown" ref={insuranceRef}>
                <span className="ins-dropdown-label">Insurance plan</span>
                <button
                  type="button"
                  className={`ins-dropdown-trigger ${insuranceOpen ? 'open' : ''}`}
                  onClick={() => {
                    setInsuranceOpen((o) => !o)
                    setInsuranceQuery('')
                  }}
                >
                  <span className={selectedInsurance ? '' : 'ins-placeholder'}>
                    {selectedInsurance?.carrier_display_name ?? 'Select a plan…'}
                  </span>
                  <span className={`ins-chevron ${insuranceOpen ? 'open' : ''}`} />
                </button>
                {insuranceOpen && (
                  <div className="ins-dropdown-panel">
                    <div className="ins-search-wrap">
                      <input
                        type="text"
                        className="ins-search-input"
                        placeholder="Search plans…"
                        value={insuranceQuery}
                        onChange={(e) => setInsuranceQuery(e.target.value)}
                      />
                    </div>
                    <ul className="ins-option-list">
                      {(() => {
                        const filtered = insurances.filter((ins) =>
                          ins.carrier_display_name
                            .toLowerCase()
                            .includes(insuranceQuery.toLowerCase()),
                        )
                        return filtered.length === 0 ? (
                          <li className="ins-no-results">No plans match "{insuranceQuery}"</li>
                        ) : (
                          filtered.map((ins) => (
                            <li key={ins.id}>
                              <button
                                type="button"
                                className={`ins-option ${selectedInsurance?.id === ins.id ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedInsurance(ins)
                                  setInsuranceOpen(false)
                                  setInsuranceQuery('')
                                }}
                              >
                                {ins.carrier_display_name}
                                {selectedInsurance?.id === ins.id && <span className="ins-check" />}
                              </button>
                            </li>
                          ))
                        )
                      })()}
                    </ul>
                  </div>
                )}
              </div>
              {selectedInsurance && (
                <label style={{ marginTop: '0.75rem' }}>
                  Member / subscriber ID
                  <input
                    type="text"
                    placeholder="Found on your insurance card"
                    value={subscriberId}
                    onChange={(e) => setSubscriberId(e.target.value)}
                  />
                </label>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selectedInsurance || !subscriberId.trim()}
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

      {/* Step 3 — Provider preferences */}
      {step === 'filters' && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('insurance')}>
            ← Back
          </button>
          <h2>Any preferences for your provider?</h2>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              marginTop: 0,
              marginBottom: '1.5rem',
            }}
          >
            All fields are optional — we'll find the best matches.
          </p>

          <div className="filter-section">
            <h3 className="filter-section-label">Language</h3>
            <FilterChipGroup
              id="language"
              options={LANGUAGE_OPTIONS}
              selected={filterLanguages}
              expandedId={expandedFilter}
              onExpand={setExpandedFilter}
              onToggle={(v) =>
                setFilterLanguages((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
              }
            />
          </div>

          <div className="filter-section">
            <h3 className="filter-section-label">Gender</h3>
            <FilterChipGroup
              id="gender"
              options={GENDER_OPTIONS}
              selected={filterGenders}
              expandedId={expandedFilter}
              onExpand={setExpandedFilter}
              onToggle={(v) =>
                setFilterGenders((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
              }
            />
          </div>

          <div className="filter-section">
            <h3 className="filter-section-label">Race / ethnicity</h3>
            <FilterChipGroup
              id="race"
              options={RACE_OPTIONS}
              selected={filterRaces}
              expandedId={expandedFilter}
              onExpand={setExpandedFilter}
              onToggle={(v) =>
                setFilterRaces((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
              }
            />
          </div>

          <div className="filter-section">
            <h3 className="filter-section-label">Specialization</h3>
            <FilterChipGroup
              id="specialization"
              options={SPECIALIZATION_OPTIONS}
              selected={filterSpecializations}
              expandedId={expandedFilter}
              onExpand={setExpandedFilter}
              onToggle={(v) =>
                setFilterSpecializations((p) =>
                  p.includes(v) ? p.filter((x) => x !== v) : [...p, v],
                )
              }
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() =>
                void handleApplyFilters({
                  language: filterLanguages[0] as SearchProviderParams['language'],
                  gender: filterGenders[0] as SearchProviderParams['gender'],
                  race: filterRaces[0] as SearchProviderParams['race'],
                  specialization:
                    filterSpecializations[0] as SearchProviderParams['specialization'],
                })
              }
            >
              {loading ? 'Searching…' : 'Find providers'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setFilterLanguages([])
                setFilterGenders([])
                setFilterRaces([])
                setFilterSpecializations([])
                void handleApplyFilters()
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Provider results */}
      {step === 'providers' && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('filters')}>
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
                <a href="mailto:epd-partnerships-deals-eng@rula.com">Contact support</a>
              </div>
            </div>
          )}
          <ul className="provider-list">
            {providers
              .slice(providerPage * PROVIDERS_PER_PAGE, (providerPage + 1) * PROVIDERS_PER_PAGE)
              .map((p) => (
                <li key={p.id}>
                  <div className="provider-card">
                    <ProviderAvatar provider={p} />
                    <div className="provider-card-info">
                      <p className="provider-card-name">
                        {p.first_name} {p.last_name[0]}.
                      </p>
                      {p.slot_start_time && (
                        <span className="provider-card-avail">
                          Available{' '}
                          {new Date(p.slot_start_time).toLocaleDateString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="provider-card-actions">
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

      {/* Step 5 — Slots */}
      {step === 'slots' && selectedProvider && (
        <div className="card">
          <button type="button" className="back-link" onClick={() => setStep('providers')}>
            ← Back
          </button>
          <div className="slots-provider-header">
            <ProviderAvatar provider={selectedProvider} size="lg" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.35rem',
              }}
            >
              <h2 style={{ margin: 0 }}>
                {selectedProvider.first_name} {selectedProvider.last_name}
              </h2>
              {selectedInsurance && (
                <span className="tag tag--insurance" style={{ alignSelf: 'flex-start' }}>
                  Accepts {selectedInsurance.carrier_display_name}
                </span>
              )}
            </div>
          </div>
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading slots…</p>}
          {slots.length === 0 && !loading && (
            <p style={{ color: 'var(--text-secondary)' }}>No upcoming slots available.</p>
          )}
          {slots.length > 0 &&
            (() => {
              const slotsByDate = groupSlotsByDate(slots)
              const dates = Object.keys(slotsByDate)
              return (
                <div className="slot-date-list">
                  {dates.map((date) => {
                    const isOpen = expandedDate === date
                    return (
                      <div key={date} className={`slot-date-group ${isOpen ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="slot-date-header"
                          onClick={() => setExpandedDate(isOpen ? null : date)}
                        >
                          <span className="slot-date-label">{date}</span>
                          <span className="slot-date-count">
                            {slotsByDate[date].length} slot
                            {slotsByDate[date].length !== 1 ? 's' : ''}
                          </span>
                          <span className={`slot-date-chevron ${isOpen ? 'open' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="slot-time-grid">
                            {slotsByDate[date].map((slot) => (
                              <button
                                key={`${slot.start_time_iso}-${slot.location}`}
                                type="button"
                                className="slot-time-chip"
                                onClick={() => handleSelectSlot(slot)}
                              >
                                <span className="slot-time-chip-time">
                                  {new Date(slot.start_time_iso).toLocaleTimeString(undefined, {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="slot-time-chip-meta">
                                  {slot.location === 'telemedicine' ? 'Virtual' : 'In-person'} ·{' '}
                                  {slot.duration_mins} min
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
        </div>
      )}

      {/* Step 6 — Patient form */}
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
            {selectedSlot.location === 'telemedicine' ? 'Virtual' : 'In-person'}
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

      {/* Step 7 — Confirmed */}
      {step === 'confirmed' && appointment && selectedSlot && (
        <div className="card">
          <div className="confirmation">
            <div className="checkmark" />
            <h2 style={{ margin: 0 }}>You're booked!</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
              Your appointment has been confirmed.
            </p>
            <div className="appt-details">
              <p>
                <strong>Provider:</strong> {selectedProvider?.first_name}{' '}
                {selectedProvider?.last_name}
              </p>
              <p>
                <strong>Confirmation ID:</strong> {appointment.appointment_id}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {new Date(selectedSlot.start_time_iso).toLocaleString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <p>
                <strong>Type:</strong> {careType}
              </p>
              <p>
                <strong>Format:</strong>{' '}
                {selectedSlot.location === 'telemedicine' ? 'Virtual' : 'In-person'}
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

      {/* Step 8 — Status */}
      {step === 'status' && (
        <div className="card">
          <h2>Appointment status</h2>
          {appointmentStatuses.length === 0 && !loading && (
            <p style={{ color: 'var(--text-secondary)' }}>No appointments found.</p>
          )}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
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
                    {appt.appointment_type === 'telemedicine' ? 'Virtual' : 'In-person'}
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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../utils/api'
import { SchedulingPage } from './SchedulingPage'

vi.mock('../utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/api')>()
  return {
    ...actual,
    api: {
      getInsurances: vi.fn(),
      searchProviders: vi.fn(),
      getProviderDetail: vi.fn(),
      getSlots: vi.fn(),
      createPatient: vi.fn(),
      bookAppointment: vi.fn(),
      getPatientAppointments: vi.fn(),
    },
  }
})

import { api } from '../utils/api'

const mockApi = vi.mocked(api)

const MOCK_INSURANCES = [
  { id: 'ins-1', carrier_display_name: 'Aetna', network_name: 'aetna', state: 'CA' },
  { id: 'ins-2', carrier_display_name: 'BlueCross', network_name: 'bluecross', state: 'CA' },
]

const MOCK_PROVIDERS = [
  { id: 'prov-1', first_name: 'Sarah', last_name: 'Chen' },
  { id: 'prov-2', first_name: 'James', last_name: 'Okafor' },
]

const MOCK_SLOTS = [
  {
    provider_id: 'prov-1',
    start_time_iso: '2030-06-02T16:00:00Z',
    duration_mins: 50,
    location: 'telemedicine' as const,
  },
  {
    provider_id: 'prov-1',
    start_time_iso: '2030-06-03T14:00:00Z',
    duration_mins: 50,
    location: 'in_person' as const,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.getInsurances.mockResolvedValue({ insurances: MOCK_INSURANCES })
  mockApi.searchProviders.mockResolvedValue({ providers: MOCK_PROVIDERS })
  mockApi.getSlots.mockResolvedValue({ slots: MOCK_SLOTS })
  mockApi.getProviderDetail.mockResolvedValue({
    id: 'prov-1',
    first_name: 'Sarah',
    last_name: 'Chen',
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function goToInsurance() {
  render(<SchedulingPage />)
  await userEvent.click(screen.getByText('Therapy'))
  await userEvent.click(screen.getByText('Virtual'))
  await userEvent.click(screen.getByText('Continue'))
  await waitFor(() => screen.getByText("What's your insurance?"))
}

async function selectInsurance(displayName: string) {
  await goToInsurance()
  await waitFor(() => screen.getByText('Select a plan…'))
  await userEvent.click(screen.getByText('Select a plan…'))
  await waitFor(() => screen.getByText(displayName))
  await userEvent.click(screen.getByText(displayName))
  await userEvent.click(screen.getByText('Continue'))
}

async function goToProviders() {
  await selectInsurance('Aetna')
  // filters step — skip to providers
  await waitFor(() => screen.getByText('Find providers'))
  await userEvent.click(screen.getByText('Find providers'))
  await waitFor(() => screen.getByText('Available providers'))
}

async function goToSlots() {
  await goToProviders()
  await waitFor(() => screen.getAllByText('Book'))
  await userEvent.click(screen.getAllByText('Book')[0])
  await waitFor(() => screen.getByText('Sarah Chen'))
}

// ─── Step 1: Care type ────────────────────────────────────────────────────────

describe('SchedulingPage — step 1: care type', () => {
  it('shows the care type step first', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('What type of care are you looking for?')).toBeInTheDocument()
  })

  it('shows Therapy and Medication management options', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('Therapy')).toBeInTheDocument()
    expect(screen.getByText('Medication management')).toBeInTheDocument()
  })

  it('Continue is disabled until a care type is selected', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('Continue')).toBeDisabled()
  })

  it('Continue enables after selecting a care type and session format', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Therapy'))
    expect(screen.getByText('Continue')).toBeDisabled()
    await userEvent.click(screen.getByText('Virtual'))
    expect(screen.getByText('Continue')).toBeEnabled()
  })

  it('can select and deselect session format options', async () => {
    render(<SchedulingPage />)
    const virtualBtn = screen.getByText('Virtual')
    await userEvent.click(virtualBtn)
    expect(virtualBtn.closest('button')).toHaveClass('selected')
    await userEvent.click(virtualBtn)
    expect(virtualBtn.closest('button')).not.toHaveClass('selected')
  })

  it('can select both session format options simultaneously', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Virtual'))
    await userEvent.click(screen.getByText('In-person'))
    expect(screen.getByText('Virtual').closest('button')).toHaveClass('selected')
    expect(screen.getByText('In-person').closest('button')).toHaveClass('selected')
  })
})

// ─── Step 2: Insurance ────────────────────────────────────────────────────────

describe('SchedulingPage — step 2: insurance', () => {
  it('advances to insurance step after clicking Continue', async () => {
    await goToInsurance()
    expect(screen.getByText("What's your insurance?")).toBeInTheDocument()
  })

  it('loads insurances when entering insurance step', async () => {
    await goToInsurance()
    await waitFor(() => expect(mockApi.getInsurances).toHaveBeenCalledOnce())
  })

  it('opens the dropdown and shows insurance options', async () => {
    await goToInsurance()
    await waitFor(() => screen.getByText('Select a plan…'))
    await userEvent.click(screen.getByText('Select a plan…'))
    await waitFor(() => {
      expect(screen.getByText('Aetna')).toBeInTheDocument()
      expect(screen.getByText('BlueCross')).toBeInTheDocument()
    })
  })

  it('filters insurance options by search query', async () => {
    await goToInsurance()
    await waitFor(() => screen.getByText('Select a plan…'))
    await userEvent.click(screen.getByText('Select a plan…'))
    await waitFor(() => screen.getByPlaceholderText('Search plans…'))
    await userEvent.type(screen.getByPlaceholderText('Search plans…'), 'Blue')
    expect(screen.getByText('BlueCross')).toBeInTheDocument()
    expect(screen.queryByText('Aetna')).not.toBeInTheDocument()
  })

  it('shows trigger label after selecting an insurance', async () => {
    await goToInsurance()
    await waitFor(() => screen.getByText('Select a plan…'))
    await userEvent.click(screen.getByText('Select a plan…'))
    await waitFor(() => screen.getByText('Aetna'))
    await userEvent.click(screen.getByText('Aetna'))
    expect(screen.getByText('Aetna')).toBeInTheDocument()
  })

  it('shows error banner if getInsurances fails', async () => {
    mockApi.getInsurances.mockRejectedValue(new ApiError(502, 'Service unavailable'))
    await goToInsurance()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('Pay out of pocket advances to filters step without insurance', async () => {
    await goToInsurance()
    await waitFor(() => screen.getByText('Pay out of pocket'))
    await userEvent.click(screen.getByText('Pay out of pocket'))
    await waitFor(() => screen.getByText('Any preferences for your provider?'))
  })
})

// ─── Step 3: Provider preferences (filters) ───────────────────────────────────

describe('SchedulingPage — step 3: provider preferences', () => {
  it('shows the filters step after selecting insurance', async () => {
    await selectInsurance('Aetna')
    expect(screen.getByText('Any preferences for your provider?')).toBeInTheDocument()
  })

  it('shows gender, race, and specialization filter sections', async () => {
    await selectInsurance('Aetna')
    expect(screen.getByText('Gender')).toBeInTheDocument()
    expect(screen.getByText('Race / ethnicity')).toBeInTheDocument()
    expect(screen.getByText('Specialization')).toBeInTheDocument()
  })

  it('can select and deselect a gender filter', async () => {
    await selectInsurance('Aetna')
    await userEvent.click(screen.getByText('Female'))
    expect(screen.getByText('Female').closest('button')).toHaveClass('selected')
    await userEvent.click(screen.getByText('Female'))
    expect(screen.getByText('Female').closest('button')).not.toHaveClass('selected')
  })

  it('can select multiple specializations', async () => {
    await selectInsurance('Aetna')
    // expand specialization section so all options are visible
    const moreBtns = screen.getAllByText(/\+\d+ more/)
    await userEvent.click(moreBtns[moreBtns.length - 1])
    await userEvent.click(screen.getByText('Anxiety'))
    await userEvent.click(screen.getByText('Grief'))
    expect(screen.getByText('Anxiety').closest('button')).toHaveClass('selected')
    expect(screen.getByText('Grief').closest('button')).toHaveClass('selected')
  })

  it('expands a filter section with "see more"', async () => {
    await selectInsurance('Aetna')
    const moreBtn = screen.getAllByText(/\+\d+ more/)[0]
    await userEvent.click(moreBtn)
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('calls searchProviders with gender filter when selected', async () => {
    await selectInsurance('Aetna')
    await userEvent.click(screen.getByText('Female'))
    await userEvent.click(screen.getByText('Find providers'))
    await waitFor(() => {
      expect(mockApi.searchProviders).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'Female' }),
      )
    })
  })

  it('calls searchProviders without filters when Skip is clicked', async () => {
    await selectInsurance('Aetna')
    await userEvent.click(screen.getByText('Female'))
    await userEvent.click(screen.getByText('Skip'))
    await waitFor(() => {
      expect(mockApi.searchProviders).toHaveBeenCalledWith(
        expect.not.objectContaining({ gender: expect.anything() }),
      )
    })
  })

  it('Back navigates to insurance step', async () => {
    await selectInsurance('Aetna')
    await userEvent.click(screen.getByText('← Back'))
    expect(screen.getByText("What's your insurance?")).toBeInTheDocument()
  })
})

// ─── Step 4: Provider results ─────────────────────────────────────────────────

describe('SchedulingPage — step 4: provider results', () => {
  it('shows providers with first name and last initial', async () => {
    await goToProviders()
    expect(screen.getByText('Sarah C.')).toBeInTheDocument()
    expect(screen.getByText('James O.')).toBeInTheDocument()
  })

  it('shows empty state when no providers are found', async () => {
    mockApi.searchProviders.mockResolvedValue({ providers: [] })
    await goToProviders()
    expect(screen.getByText('No providers found')).toBeInTheDocument()
  })

  it('shows error banner if searchProviders fails', async () => {
    mockApi.searchProviders.mockRejectedValue(new ApiError(502, 'Upstream failure'))
    await selectInsurance('Aetna')
    await waitFor(() => screen.getByText('Find providers'))
    await userEvent.click(screen.getByText('Find providers'))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('passes care_category=psychiatry when Medication management is selected', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Medication management'))
    await userEvent.click(screen.getByText('Virtual'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByText("What's your insurance?"))
    await waitFor(() => screen.getByText('Select a plan…'))
    await userEvent.click(screen.getByText('Select a plan…'))
    await waitFor(() => screen.getByText('Aetna'))
    await userEvent.click(screen.getByText('Aetna'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByText('Find providers'))
    await userEvent.click(screen.getByText('Find providers'))
    await waitFor(() => {
      expect(mockApi.searchProviders).toHaveBeenCalledWith(
        expect.objectContaining({ care_category: 'psychiatry' }),
      )
    })
  })

  it('Back navigates to the filters step', async () => {
    await goToProviders()
    await userEvent.click(screen.getByText('← Back'))
    expect(screen.getByText('Any preferences for your provider?')).toBeInTheDocument()
  })
})

// ─── Step 5: Slots ────────────────────────────────────────────────────────────

describe('SchedulingPage — step 5: slots', () => {
  it('calls getSlots when Book is clicked', async () => {
    await goToProviders()
    await userEvent.click(screen.getAllByText('Book')[0])
    await waitFor(() => {
      expect(mockApi.getSlots).toHaveBeenCalledWith('prov-1', 'CA', 'telemedicine')
    })
  })

  it('shows provider name on the slots page', async () => {
    await goToSlots()
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
  })

  it('shows slot dates as accordion rows', async () => {
    await goToSlots()
    const dateRows = screen.getAllByText(/slot/)
    expect(dateRows.length).toBeGreaterThan(0)
  })

  it('shows error banner if getSlots fails', async () => {
    mockApi.getSlots.mockRejectedValue(new ApiError(404, 'Provider not found'))
    await goToProviders()
    await userEvent.click(screen.getAllByText('Book')[0])
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows insurance tag when insurance was selected', async () => {
    await goToSlots()
    expect(screen.getByText('Accepts Aetna')).toBeInTheDocument()
  })
})

// ─── Error handling ───────────────────────────────────────────────────────────

describe('SchedulingPage — error handling', () => {
  it('shows conflict error style for 409', async () => {
    mockApi.searchProviders.mockRejectedValue(new ApiError(409, 'Slot taken'))
    await selectInsurance('Aetna')
    await waitFor(() => screen.getByText('Find providers'))
    await userEvent.click(screen.getByText('Find providers'))
    await waitFor(() => {
      expect(screen.getByRole('alert').className).toContain('conflict')
    })
  })
})

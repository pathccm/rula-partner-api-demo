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

describe('SchedulingPage — initial render', () => {
  it('shows the care type step first', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('What kind of care are you looking for?')).toBeInTheDocument()
  })

  it('shows all four care type options', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('Individual therapy')).toBeInTheDocument()
    expect(screen.getByText('Couples therapy')).toBeInTheDocument()
    expect(screen.getByText('Family therapy')).toBeInTheDocument()
    expect(screen.getByText('Psychiatry')).toBeInTheDocument()
  })

  it('Continue button is disabled until a care type is selected', () => {
    render(<SchedulingPage />)
    expect(screen.getByText('Continue')).toBeDisabled()
  })

  it('Continue button enables after selecting a care type', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    expect(screen.getByText('Continue')).toBeEnabled()
  })
})

describe('SchedulingPage — step 1 → step 2 (insurance)', () => {
  it('advances to insurance step after clicking Continue', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByText("What's your insurance?")).toBeInTheDocument()
    })
  })

  it('loads insurances when entering insurance step', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(mockApi.getInsurances).toHaveBeenCalledOnce()
    })
  })

  it('renders the insurance dropdown with loaded options', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByText('Aetna')).toBeInTheDocument()
      expect(screen.getByText('BlueCross')).toBeInTheDocument()
    })
  })

  it('shows error banner if getInsurances fails', async () => {
    mockApi.getInsurances.mockRejectedValue(new ApiError(502, 'Service unavailable'))
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

describe('SchedulingPage — step 2 → step 3 (providers)', () => {
  it('calls searchProviders with the selected insurance network_name', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(mockApi.searchProviders).toHaveBeenCalledWith(
        expect.objectContaining({ insurance: 'aetna' }),
      )
    })
  })

  it('shows provider names after search', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('James Okafor')).toBeInTheDocument()
    })
  })

  it('shows empty state when no providers are found', async () => {
    mockApi.searchProviders.mockResolvedValue({ providers: [] })
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByText('No providers found')).toBeInTheDocument()
    })
  })

  it('shows error banner if searchProviders fails', async () => {
    mockApi.searchProviders.mockRejectedValue(new ApiError(502, 'Upstream failure'))
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('passes care_category=psychiatry when Psychiatry is selected', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Psychiatry'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(mockApi.searchProviders).toHaveBeenCalledWith(
        expect.objectContaining({ care_category: 'psychiatry' }),
      )
    })
  })
})

describe('SchedulingPage — step 3 → step 4 (slots)', () => {
  it('calls getSlots when View slots is clicked', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getAllByText('View slots'))
    await userEvent.click(screen.getAllByText('View slots')[0])
    await waitFor(() => {
      expect(mockApi.getSlots).toHaveBeenCalledWith('prov-1', 'CA', null)
    })
  })

  it('shows slots after provider is selected', async () => {
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getAllByText('View slots'))
    await userEvent.click(screen.getAllByText('View slots')[0])
    await waitFor(() => {
      expect(screen.getByText('Select a time that works for you')).toBeInTheDocument()
    })
  })

  it('shows error banner if getSlots fails', async () => {
    mockApi.getSlots.mockRejectedValue(new ApiError(404, 'Provider not found'))
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getAllByText('View slots'))
    await userEvent.click(screen.getAllByText('View slots')[0])
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

describe('SchedulingPage — error banner display', () => {
  it('shows conflict error type for 409', async () => {
    mockApi.searchProviders.mockRejectedValue(new ApiError(409, 'Slot taken'))
    render(<SchedulingPage />)
    await userEvent.click(screen.getByText('Individual therapy'))
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => screen.getByLabelText('Insurance plan'))
    await userEvent.selectOptions(screen.getByLabelText('Insurance plan'), 'ins-1')
    await userEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('conflict')
    })
  })
})

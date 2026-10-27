import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Activity, ActivitiesResponse, ActivitySummary } from '../types/activity'
import { deleteActivity, getActivities, getActivityById, getActivitySummary } from '../api/activityApi'
import Activities from './Activities'

vi.mock('../hooks/useAuth', () => ({
  default: () => ({ token: 'test-token' }),
}))

vi.mock('../api/activityApi', () => ({
  createActivity: vi.fn(),
  deleteActivity: vi.fn(),
  getActivities: vi.fn(),
  getActivityById: vi.fn(),
  getActivitySummary: vi.fn(),
  updateActivity: vi.fn(),
}))

const activityFixtures: Activity[] = [
  {
    id: 'activity-1',
    userId: 'user-1',
    createdAt: '2026-10-25T08:00:00.000Z',
    updatedAt: null,
    title: 'Read a book',
    description: 'Read for 30 minutes',
    activityDate: '2026-10-26T10:00:00.000Z',
    status: 3,
    priority: 3,
  },
  {
    id: 'activity-2',
    userId: 'user-1',
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: null,
    title: 'Take a walk',
    description: 'Walk around the neighborhood',
    activityDate: '2026-10-27T10:00:00.000Z',
    status: 1,
    priority: 2,
  },
]

const summaryFixture: ActivitySummary = {
  totalActivities: 42,
  pendingCount: 12,
  inProgressCount: 8,
  completedCount: 20,
  cancelledCount: 2,
}

function activitiesResponse(items: Activity[], totalCount: number): ActivitiesResponse {
  return {
    activities: {
      page: 1,
      pageSize: 10,
      totalCount,
      totalPages: Math.ceil(totalCount / 10),
      items,
    },
    availableStatuses: [1, 2, 3, 4],
    availablePriorities: [1, 2, 3],
  }
}

function renderActivities() {
  return render(
    <Activities
      onViewDetails={vi.fn()}
      onCreateActivity={vi.fn()}
      onNotify={vi.fn()}
      mutation={null}
      isActive
      focusActivityId={null}
      onFocusActivityChange={vi.fn()}
    />,
  )
}

describe('Activities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getActivitySummary).mockResolvedValue(summaryFixture)
    vi.mocked(getActivityById).mockResolvedValue(activityFixtures[0])
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
  })

  it('announces that activities are loading while the list request is pending', () => {
    const pendingListRequest = new Promise<ActivitiesResponse>(() => {})
    vi.mocked(getActivities).mockImplementation((_token, query = {}) =>
      query.status === 4
        ? Promise.resolve(activitiesResponse([], 0))
        : pendingListRequest,
    )

    renderActivities()

    const loadingStatus = screen
      .getAllByRole('status')
      .find((status) => status.textContent?.trim() === 'Loading activities...')

    expect(loadingStatus).toBeTruthy()
  })

  it('shows loaded activity titles and the total matching count', async () => {
    vi.mocked(getActivities).mockImplementation((_token, query = {}) =>
      Promise.resolve(
        query.status === 4
          ? activitiesResponse([], 2)
          : activitiesResponse(activityFixtures, 42),
      ),
    )

    renderActivities()

    expect(await screen.findByRole('heading', { name: 'Read a book' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Take a walk' })).toBeTruthy()
    expect(await screen.findByText(/42 activities/)).toBeTruthy()
  })

  it('shows an accessible error and Retry button when the initial list request fails', async () => {
    vi.mocked(getActivities).mockImplementation((_token, query = {}) =>
      query.status === 4
        ? Promise.resolve(activitiesResponse([], 2))
        : Promise.reject(new Error('List request failed')),
    )

    renderActivities()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Failed to load activities.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('loads and displays activities after retrying a failed initial list request', async () => {
    const user = userEvent.setup()
    let mainListRequestCount = 0
    vi.mocked(getActivities).mockImplementation((_token, query = {}) => {
      if (query.status === 4) {
        return Promise.resolve(activitiesResponse([], 2))
      }

      mainListRequestCount += 1
      if (mainListRequestCount === 1) {
        return Promise.reject(new Error('List request failed'))
      }

      return Promise.resolve(activitiesResponse(activityFixtures, 42))
    })

    renderActivities()

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Read a book' })).toBeTruthy()
    expect(await screen.findByText(/42 activities/)).toBeTruthy()
  })
})

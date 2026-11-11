import { render, screen, waitFor } from '@testing-library/react'
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
  describe('create mutation lifecycle', () => {
    function makeActivity(id: string, title: string): Activity {
      return { ...activityFixtures[0], id, title }
    }

    const pageOne = Array.from({ length: 10 }, (_, i) => makeActivity(`p1-${i}`, `Page one item ${i}`))
    const createdActivity = makeActivity('created-1', 'Newly created activity')
    const pageTwo = [makeActivity('p2-0', 'Page two item 0'), createdActivity]

    function pagedResponse(page: number): ActivitiesResponse {
      return {
        activities: { page, pageSize: 10, totalCount: 12, totalPages: 2, items: [...(page === 2 ? pageTwo : pageOne)] },
        availableStatuses: [1, 2, 3, 4],
        availablePriorities: [1, 2, 3],
      }
    }

    type Mutation = { kind: 'create' | 'update' | 'delete'; id: string; nonce: number } | null

    function renderWithMutation(mutation: Mutation) {
      return (
        <Activities
          onViewDetails={vi.fn()}
          onCreateActivity={vi.fn()}
          onNotify={vi.fn()}
          mutation={mutation}
          isActive
          focusActivityId={null}
          onFocusActivityChange={vi.fn()}
        />
      )
    }

    it('navigates to the page containing a created activity when the list was on page 2', async () => {
      const user = userEvent.setup()
      // Resolve after a macrotask, as a real network response would, so React can
      // commit the Create branch's state resets before the page scan resumes.
      vi.mocked(getActivities).mockImplementation(async (_token, query = {}) => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return query.status === 4 ? activitiesResponse([], 0) : pagedResponse(query.page ?? 1)
      })

      const view = render(renderWithMutation(null))
      await screen.findByRole('heading', { name: 'Page one item 0' })
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await screen.findByRole('heading', { name: 'Page two item 0' })

      view.rerender(renderWithMutation({ kind: 'create', id: createdActivity.id, nonce: 1 }))

      expect(await screen.findByRole('heading', { name: 'Newly created activity' })).toBeTruthy()
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Page one item 0' })).toBeNull())
    })

    it('keeps locating a created activity on page 2 when the list refresh resolves during the page scan', async () => {
      let releasePageTwo: () => void = () => {}
      const pageTwoGate = new Promise<void>((resolve) => { releasePageTwo = resolve })
      let gatePageTwo = false
      vi.mocked(getActivities).mockImplementation(async (_token, query = {}) => {
        if (query.status === 4) return activitiesResponse([], 0)
        const page = query.page ?? 1
        if (page === 2 && gatePageTwo) await pageTwoGate
        return pagedResponse(page)
      })

      const view = render(renderWithMutation(null))
      await screen.findByRole('heading', { name: 'Page one item 0' })

      gatePageTwo = true
      const callsBefore = vi.mocked(getActivities).mock.calls.length
      view.rerender(renderWithMutation({ kind: 'create', id: createdActivity.id, nonce: 1 }))

      // Wait until the scan has requested page 2 and the page-1 list refresh has completed.
      await waitFor(() => {
        const newCalls = vi.mocked(getActivities).mock.calls.slice(callsBefore)
        expect(newCalls.some(([, q]) => q?.page === 2)).toBe(true)
        expect(newCalls.filter(([, q]) => q?.page === 1 && q?.status === undefined).length).toBeGreaterThanOrEqual(2)
      })
      await screen.findByRole('heading', { name: 'Page one item 0' })

      releasePageTwo()

      expect(await screen.findByRole('heading', { name: 'Newly created activity' })).toBeTruthy()
    })

    it('processes a mutation nonce only once across re-renders', async () => {
      vi.mocked(getActivities).mockImplementation((_token, query = {}) =>
        Promise.resolve(query.status === 4 ? activitiesResponse([], 0) : pagedResponse(query.page ?? 1)),
      )
      const mutation = { kind: 'create' as const, id: createdActivity.id, nonce: 7 }

      const view = render(renderWithMutation(null))
      await screen.findByRole('heading', { name: 'Page one item 0' })
      view.rerender(renderWithMutation(mutation))
      await screen.findByRole('heading', { name: 'Newly created activity' })
      await waitFor(() => expect(screen.queryByText('Loading activities...')).toBeNull())

      const settledCalls = vi.mocked(getActivities).mock.calls.length
      view.rerender(renderWithMutation({ ...mutation }))
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(vi.mocked(getActivities).mock.calls.length).toBe(settledCalls)
    })
  })
})

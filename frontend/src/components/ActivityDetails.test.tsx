import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { deleteActivity, getActivityById, updateActivity } from '../api/activityApi'
import type { Activity } from '../types/activity'
import ActivityDetails from './ActivityDetails'

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

const activityId = '00000000-0000-4000-8000-000000000001'

const activity: Activity = {
  id: activityId,
  userId: '00000000-0000-4000-8000-000000000002',
  createdAt: '2026-10-25T08:00:00.000Z',
  updatedAt: '2026-10-26T09:30:00.000Z',
  title: 'Read a book',
  description: 'Read for 30 minutes',
  activityDate: '2026-10-27T10:00:00.000Z',
  status: 3,
  priority: 3,
}

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

function renderActivityDetails(overrides: Partial<ComponentProps<typeof ActivityDetails>> = {}) {
  const props: ComponentProps<typeof ActivityDetails> = {
    activityId,
    mode: 'details',
    onBack: vi.fn(),
    onEdit: vi.fn(),
    onDeleted: vi.fn(),
    onDirtyChange: vi.fn(),
    onSubmittingChange: vi.fn(),
    onUpdated: vi.fn(),
    onUnavailable: vi.fn(),
    ...overrides,
  }

  return { ...render(<ActivityDetails {...props} />), props }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

describe('ActivityDetails', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true
      }),
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false
      }),
    })
    vi.mocked(getActivityById).mockResolvedValue(activity)
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (originalShowModal) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    }

    if (originalClose) {
      Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    }
  })

  it('shows loading accessibly and then displays the activity title when loading succeeds', async () => {
    let resolveActivity!: (value: Activity) => void
    vi.mocked(getActivityById).mockReturnValue(
      new Promise<Activity>((resolve) => {
        resolveActivity = resolve
      }),
    )

    renderActivityDetails()

    const loadingMessage = await screen.findByText(/Loading activity/)
    expect(loadingMessage.closest('[role="status"]')).toBeTruthy()

    await act(async () => {
      resolveActivity(activity)
    })

    expect(await screen.findByRole('heading', { name: 'Read a book', level: 1 })).toBeTruthy()
  })

  it('shows the activity description, status, priority, and date metadata', async () => {
    renderActivityDetails()

    expect(await screen.findByRole('heading', { name: 'Read a book', level: 1 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Description' })).toBeTruthy()
    expect(screen.getByText('Read for 30 minutes')).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText(formatDate(activity.activityDate))).toBeTruthy()
    expect(screen.getByText(formatDate(activity.createdAt))).toBeTruthy()
    expect(screen.getByText(formatDate(activity.updatedAt!))).toBeTruthy()
  })

  it('shows fallbacks when the description and updated date are missing', async () => {
    vi.mocked(getActivityById).mockResolvedValue({
      ...activity,
      description: null,
      updatedAt: null,
    })

    renderActivityDetails()

    expect(await screen.findByText('No description provided.')).toBeTruthy()
    expect(screen.getByText('Never updated')).toBeTruthy()
  })

  it('calls onBack when the Back to Activities button is activated', async () => {
    const user = userEvent.setup()
    const { props } = renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Back to Activities' }))

    expect(props.onBack).toHaveBeenCalledOnce()
  })

  it('calls onEdit when the Edit button is activated', async () => {
    const user = userEvent.setup()
    const { props } = renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(props.onEdit).toHaveBeenCalledOnce()
  })

  it('shows a load error and retries successfully', async () => {
    const user = userEvent.setup()
    let mainRequestCount = 0
    vi.mocked(getActivityById).mockImplementation(() => {
      mainRequestCount += 1
      return mainRequestCount === 1
        ? Promise.reject(new Error('Could not load this activity. Please try again.'))
        : Promise.resolve(activity)
    })
    const { props } = renderActivityDetails()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Read a book', level: 1 })).toBeTruthy()
    expect(props.onBack).not.toHaveBeenCalled()
  })

  it('uses onUnavailable for an activity that returns 404', async () => {
    const user = userEvent.setup()
    const notFoundError = Object.assign(new Error('Not found'), { status: 404 })
    vi.mocked(getActivityById).mockRejectedValue(notFoundError)
    const { props } = renderActivityDetails()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('This activity may have been deleted or is no longer available.')
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Back to Activities' }))

    expect(props.onUnavailable).toHaveBeenCalledOnce()
    expect(props.onBack).not.toHaveBeenCalled()
  })

  it('opens the delete dialog from the activity details', async () => {
    const user = userEvent.setup()
    renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('dialog', { name: 'Delete activity?' })).toBeTruthy()
  })

  it('closes the delete dialog on Cancel without deleting the activity', async () => {
    const user = userEvent.setup()
    const { props } = renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete activity?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete activity?' })).toBeNull()
    })
    expect(deleteActivity).not.toHaveBeenCalled()
    expect(props.onDeleted).not.toHaveBeenCalled()
  })

  it('calls onDeleted after the delete request succeeds', async () => {
    const user = userEvent.setup()
    let resolveDelete!: () => void
    vi.mocked(deleteActivity).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve
      }),
    )
    const { props } = renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete activity?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(deleteActivity).toHaveBeenCalledWith('test-token', activityId)
    expect(props.onDeleted).not.toHaveBeenCalled()

    await act(async () => {
      resolveDelete()
    })

    await waitFor(() => expect(props.onDeleted).toHaveBeenCalledOnce())
  })

  it('shows a delete error and keeps the dialog open when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteActivity).mockRejectedValue(new Error('Delete request failed'))
    const { props } = renderActivityDetails()

    await screen.findByRole('heading', { name: 'Read a book', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete activity?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert.textContent).toContain('Delete request failed')
    expect(screen.getByRole('dialog', { name: 'Delete activity?' })).toBeTruthy()
    expect(props.onDeleted).not.toHaveBeenCalled()
  })

  it('passes the saved Activity to onUpdated when the edit form saves successfully', async () => {
    const user = userEvent.setup()
    const savedActivity = { ...activity, title: 'Read another book', updatedAt: '2026-10-28T09:30:00.000Z' }
    vi.mocked(updateActivity).mockResolvedValue(savedActivity)
    const { props } = renderActivityDetails({ mode: 'edit' })

    expect(await screen.findByRole('heading', { name: 'Edit Activity' })).toBeTruthy()
    await user.clear(screen.getByRole('textbox', { name: 'Activity title' }))
    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), savedActivity.title)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(props.onUpdated).toHaveBeenCalledWith(savedActivity))
  })
})

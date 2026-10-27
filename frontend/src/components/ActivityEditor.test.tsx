import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { createActivity, updateActivity } from '../api/activityApi'
import type { Activity } from '../types/activity'
import ActivityEditor from './ActivityEditor'

const authState = vi.hoisted(() => ({ token: 'test-token' }))

vi.mock('../hooks/useAuth', () => ({
  default: () => authState,
}))

vi.mock('../api/activityApi', () => ({
  createActivity: vi.fn(),
  deleteActivity: vi.fn(),
  getActivities: vi.fn(),
  getActivityById: vi.fn(),
  getActivitySummary: vi.fn(),
  updateActivity: vi.fn(),
}))

const activity: Activity = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  createdAt: '2026-10-25T08:00:00.000Z',
  updatedAt: '2026-10-26T09:30:00.000Z',
  title: 'Read a book',
  description: 'Existing notes',
  activityDate: '2026-10-27T10:35:00.000Z',
  status: 2,
  priority: 2,
}

function renderEditor(mode: 'create' | 'edit', suppliedActivity?: Activity) {
  const props: ComponentProps<typeof ActivityEditor> = {
    mode,
    activity: suppliedActivity,
    onBack: vi.fn(),
    onDirtyChange: vi.fn(),
    onSubmittingChange: vi.fn(),
    onSaved: vi.fn(),
  }

  return { ...render(<ActivityEditor {...props} />), props }
}

function localActivityDateTime(value: string) {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  const dateValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const displayDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
    .format(new Date(`${dateValue}T12:00:00`))

  return {
    dateValue,
    displayDate,
    timeValue: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

async function chooseStatus(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
) {
  await user.click(screen.getByRole('button', { name: `Status ${current}` }))
  await user.click(screen.getByRole('option', { name: next }))
}

async function choosePriority(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
) {
  await user.click(screen.getByRole('button', { name: `Priority ${current}` }))
  await user.click(screen.getByRole('option', { name: next }))
}

async function changeEditTitle(user: ReturnType<typeof userEvent.setup>, title: string) {
  const titleInput = screen.getByRole('textbox', { name: 'Activity title' })
  await user.clear(titleInput)
  await user.type(titleInput, title)
}

function expectValidIsoDateTime(value: string) {
  expect(Number.isNaN(Date.parse(value))).toBe(false)
  expect(new Date(value).toISOString()).toBe(value)
}

describe('ActivityEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authState.token = 'test-token'
  })

  it('shows create defaults without depending on the current date or time', () => {
    renderEditor('create')

    expect((screen.getByRole('textbox', { name: 'Activity title' }) as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Status Pending' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Priority Low' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Choose activity date' }).textContent?.trim()).not.toBe('Choose date')
    expect(screen.getByRole('button', { name: 'Choose activity time' }).textContent?.trim()).not.toBe('Choose time')
  })

  it('shows Edit values, including a blank field for a null description', () => {
    renderEditor('edit', { ...activity, description: null })
    const dateTime = localActivityDateTime(activity.activityDate)

    expect((screen.getByRole('textbox', { name: 'Activity title' }) as HTMLInputElement).value).toBe(activity.title)
    expect((screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Status In Progress' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Priority Medium' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Choose activity date' }).textContent?.trim()).toBe(dateTime.displayDate)
    expect(screen.getByRole('button', { name: 'Choose activity time' }).textContent?.trim()).toBe(dateTime.timeValue)
  })

  it('enables Edit saving after a change and reports the dirty state', async () => {
    const user = userEvent.setup()
    const { props } = renderEditor('edit', activity)
    const saveButton = screen.getByRole('button', { name: 'Save Changes' })

    expect(saveButton.hasAttribute('disabled')).toBe(true)
    expect(props.onDirtyChange).toHaveBeenCalledWith(false)

    await changeEditTitle(user, 'Read another book')

    await waitFor(() => {
      expect(saveButton.hasAttribute('disabled')).toBe(false)
      expect(props.onDirtyChange).toHaveBeenCalledWith(true)
    })
  })

  it('creates an Activity with trimmed values and the selected numeric options', async () => {
    const user = userEvent.setup()
    const savedActivity = { ...activity, title: 'Plan a trip', description: 'Travel notes', status: 3 as const, priority: 3 as const }
    vi.mocked(createActivity).mockResolvedValue(savedActivity)
    const { props } = renderEditor('create')

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), '  Plan a trip  ')
    await user.type(screen.getByRole('textbox', { name: 'Description' }), '  Travel notes  ')
    await chooseStatus(user, 'Pending', 'Completed')
    await choosePriority(user, 'Low', 'High')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(savedActivity))
    const request = vi.mocked(createActivity).mock.calls[0]?.[0]
    expect(vi.mocked(createActivity).mock.calls[0]?.[1]).toBe('test-token')
    expect(request).toMatchObject({
      title: 'Plan a trip',
      description: 'Travel notes',
      status: 3,
      priority: 3,
    })
    expectValidIsoDateTime(request!.activityDate)
  })

  it('sends a null description when creating with an empty description', async () => {
    const user = userEvent.setup()
    const { props } = renderEditor('create')
    vi.mocked(createActivity).mockResolvedValue(activity)

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), 'A new activity')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(activity))
    const request = vi.mocked(createActivity).mock.calls[0]?.[0]
    expect(request?.description).toBeNull()
    expect(request?.title).toBe('A new activity')
    expectValidIsoDateTime(request!.activityDate)
  })

  it('updates the Activity with the token, id, and normalized form values', async () => {
    const user = userEvent.setup()
    const savedActivity = { ...activity, title: 'Read a newer book', description: 'Updated notes', status: 3 as const, priority: 3 as const }
    vi.mocked(updateActivity).mockResolvedValue(savedActivity)
    const { props } = renderEditor('edit', activity)

    await changeEditTitle(user, '  Read a newer book  ')
    const description = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(description)
    await user.type(description, '  Updated notes  ')
    await chooseStatus(user, 'In Progress', 'Completed')
    await choosePriority(user, 'Medium', 'High')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(savedActivity))
    const [token, id, request] = vi.mocked(updateActivity).mock.calls[0]!
    expect(token).toBe('test-token')
    expect(id).toBe(activity.id)
    expect(request).toMatchObject({
      title: 'Read a newer book',
      description: 'Updated notes',
      status: 3,
      priority: 3,
    })
    expectValidIsoDateTime(request.activityDate)
  })

  it('shows create-submitting state and prevents another submit while pending', async () => {
    const user = userEvent.setup()
    let resolveCreate!: (saved: Activity) => void
    vi.mocked(createActivity).mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    const { props } = renderEditor('create')

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), 'Pending create')
    await user.dblClick(screen.getByRole('button', { name: 'Create Activity' }))

    const creatingButton = screen.getByRole('button', { name: 'Creating…' })
    expect(creatingButton.hasAttribute('disabled')).toBe(true)
    expect(creatingButton.getAttribute('aria-busy')).toBe('true')
    expect(props.onSubmittingChange).toHaveBeenCalledWith(true)
    expect(createActivity).toHaveBeenCalledOnce()
    expect(props.onSaved).not.toHaveBeenCalled()

    await act(async () => {
      resolveCreate(activity)
    })
    expect(await screen.findByRole('button', { name: 'Create Activity' })).toBeTruthy()
    expect(props.onSaved).toHaveBeenCalledWith(activity)
    expect(props.onSubmittingChange).toHaveBeenCalledWith(false)
  })

  it('shows edit-submitting state and resets it after the request resolves', async () => {
    const user = userEvent.setup()
    let resolveUpdate!: (saved: Activity) => void
    vi.mocked(updateActivity).mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve }))
    const { props } = renderEditor('edit', activity)

    await changeEditTitle(user, 'A pending update')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    const savingButton = screen.getByRole('button', { name: 'Saving…' })
    expect(savingButton.hasAttribute('disabled')).toBe(true)
    expect(savingButton.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('button', { name: 'Back to Details' }).hasAttribute('disabled')).toBe(true)
    expect(props.onSubmittingChange).toHaveBeenCalledWith(true)
    expect(props.onSaved).not.toHaveBeenCalled()

    await act(async () => {
      resolveUpdate(activity)
    })
    expect(await screen.findByRole('button', { name: 'Save Changes' })).toBeTruthy()
    expect(props.onSaved).toHaveBeenCalledWith(activity)
    expect(props.onSubmittingChange).toHaveBeenCalledWith(false)
  })

  it('shows a create API error and resets submitting state', async () => {
    const user = userEvent.setup()
    vi.mocked(createActivity).mockRejectedValue(new Error('Create service failed'))
    const { props } = renderEditor('create')

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), 'Fail this create')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Create service failed')
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onSubmittingChange).toHaveBeenCalledWith(false)
  })

  it('shows an edit API error and resets submitting state', async () => {
    const user = userEvent.setup()
    vi.mocked(updateActivity).mockRejectedValue(new Error('Update service failed'))
    const { props } = renderEditor('edit', activity)

    await changeEditTitle(user, 'Fail this update')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Update service failed')
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onSubmittingChange).toHaveBeenCalledWith(false)
  })

  it('shows the fallback message when a non-Error create failure is returned', async () => {
    const user = userEvent.setup()
    vi.mocked(createActivity).mockRejectedValue('unexpected failure')
    renderEditor('create')

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), 'Fail with fallback')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Could not save this activity. Please try again.')
  })

  it('reports missing authentication and does not call the create API', async () => {
    const user = userEvent.setup()
    authState.token = ''
    renderEditor('create')

    await user.type(screen.getByRole('textbox', { name: 'Activity title' }), 'Needs a token')
    await user.click(screen.getByRole('button', { name: 'Create Activity' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Please sign in to save this activity.')
    expect(createActivity).not.toHaveBeenCalled()
    expect(updateActivity).not.toHaveBeenCalled()
  })

  it('reports missing authentication and does not call the update API', async () => {
    const user = userEvent.setup()
    authState.token = ''
    renderEditor('edit', activity)

    await changeEditTitle(user, 'Needs a token')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Please sign in to save this activity.')
    expect(createActivity).not.toHaveBeenCalled()
    expect(updateActivity).not.toHaveBeenCalled()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Activity } from '../types/activity'
import ActivityCard from './ActivityCard'

const activity: Activity = {
  id: 'activity-1',
  userId: 'user-1',
  createdAt: '2026-10-25T08:00:00.000Z',
  updatedAt: null,
  title: 'Read a book',
  description: 'Read for 30 minutes',
  activityDate: '2026-10-26T10:00:00.000Z',
  status: 3,
  priority: 3,
}

describe('ActivityCard', () => {
  it('shows the activity details with an accessible name', () => {
    render(<ActivityCard activity={activity} onViewDetails={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'View details for Read a book' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Read a book' })).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
    expect(screen.getByText('High Priority')).toBeTruthy()
    expect(screen.getByText('Activity date: 26 Oct 2026')).toBeTruthy()
  })

  it('opens activity details when clicked', async () => {
    const user = userEvent.setup()
    const onViewDetails = vi.fn()
    render(<ActivityCard activity={activity} onViewDetails={onViewDetails} />)

    await user.click(screen.getByRole('link', { name: 'View details for Read a book' }))

    expect(onViewDetails).toHaveBeenCalledExactlyOnceWith('activity-1')
  })

  it('opens activity details with Enter and Space from the keyboard', async () => {
    const user = userEvent.setup()
    const onViewDetails = vi.fn()
    render(<ActivityCard activity={activity} onViewDetails={onViewDetails} />)
    const card = screen.getByRole('link', { name: 'View details for Read a book' })

    await user.tab()
    expect(document.activeElement).toBe(card)

    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(onViewDetails).toHaveBeenNthCalledWith(1, 'activity-1')
    expect(onViewDetails).toHaveBeenNthCalledWith(2, 'activity-1')
  })
})

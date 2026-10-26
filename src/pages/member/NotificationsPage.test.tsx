import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { NotificationCounts } from '@/types/api'

const unreadCount = async () => (await apiClient.get<NotificationCounts>('/notifications/counts')).data.notifications

async function open() {
  const utils = renderWithProviders(routes, { initialPath: '/notifications' })
  await screen.findByRole('heading', { level: 1, name: 'Notifications' })
  return utils
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Notifications (FE-NTF-01, UX-26)', () => {
  it('shows unread counts in the header', async () => {
    await open()

    expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(screen.getByRole('link', { name: 'Messages, 1 unread' })).toHaveAttribute('href', '/messages')
  })

  it('opens the notification’s page and marks it read', async () => {
    const user = userEvent.setup()
    const { router } = await open()

    const list = await screen.findByRole('list', { name: 'Notifications' })
    await user.click(within(list).getByRole('link', { name: /Ibrahim S\. countered your offer/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers/o-ps4-counter'))
    await waitFor(async () => expect(await unreadCount()).toBe(1))
  })

  it('shows where things stand now when an old “accepted” alert is opened (FE-NTF-01)', async () => {
    const user = userEvent.setup()
    // After the alert, the deal was cancelled by both people
    await apiClient.post(
      '/transactions/t-o-xbox-accepted/cancellation',
      { reason: 'CHANGED_MIND' },
      { headers: idempotencyHeaders('cancel') },
    )
    mockAuth.signInAs('u-chidi')
    await apiClient.post(
      '/transactions/t-o-xbox-accepted/cancellation/accept',
      {},
      { headers: idempotencyHeaders('agree') },
    )
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await open()

    await user.click(await screen.findByRole('link', { name: /Chidi O\. accepted your offer/ }))

    expect(await screen.findByText('The deal was cancelled')).toBeInTheDocument()
    expect(screen.queryByText(copy.offerAccepted)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument()
  })

  it('marks everything read at once', async () => {
    const user = userEvent.setup()
    await open()

    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }))

    expect(await screen.findByText('You’re all caught up.')).toBeInTheDocument()
    expect(await unreadCount()).toBe(0)
    await waitFor(() => expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument())
  })

  it('has an empty state', async () => {
    mockAuth.signInAs('u-amaka')
    await open()

    expect(await screen.findByRole('heading', { name: 'No notifications yet' })).toBeInTheDocument()
  })
})

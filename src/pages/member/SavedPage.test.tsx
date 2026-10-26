import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { listingsDb } from '@/mocks/db/listings'
import { renderWithProviders } from '@/test/utils'
import type { SavedIds } from '@/types/api'

async function open(tab?: string) {
  const utils = renderWithProviders(routes, { initialPath: `/saved${tab ? `?tab=${tab}` : ''}` })
  await screen.findByRole('heading', { level: 1, name: 'Saved' })
  return utils
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Saved (FE-SAV-01, UX-26)', () => {
  it('lists saved listings with their true state', async () => {
    listingsDb.setStatus('l5', 'RESERVED')
    await open()

    const list = await screen.findByRole('list', { name: 'Saved listings' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText('Reserved')).toBeInTheDocument()
    expect(within(items[2]!).getByText('Expired')).toBeInTheDocument()
  })

  it('removes a listing from saved at once', async () => {
    const user = userEvent.setup()
    await open()

    await user.click(await screen.findByRole('button', { name: 'Remove IBM ThinkPad R51 from saved' }))

    await waitFor(() =>
      expect(within(screen.getByRole('list', { name: 'Saved listings' })).getAllByRole('listitem')).toHaveLength(2),
    )
    expect((await apiClient.get<SavedIds>('/saved/ids')).data.listings).not.toContain('l15')
  })

  it('shows saved posts with the listing as it is now', async () => {
    await open('posts')

    const list = await screen.findByRole('list', { name: 'Saved posts' })
    const xbox = within(list).getByRole('article', { name: 'Xbox Series X · 1TB' })
    expect(within(xbox).getByText('Reserved')).toBeInTheDocument()
    expect(within(xbox).queryByRole('link', { name: 'Make an offer' })).not.toBeInTheDocument()
    expect(within(xbox).getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has an empty state with a way forward', async () => {
    await apiClient.delete('/saved/post/p-macbook')
    await apiClient.delete('/saved/post/p-xbox')
    await open('posts')

    expect(await screen.findByRole('heading', { name: 'No saved posts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the feed' })).toHaveAttribute('href', '/feed')
  })
})

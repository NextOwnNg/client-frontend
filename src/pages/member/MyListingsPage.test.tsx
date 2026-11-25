import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { CHANGES_SAMPLE_ID, listingsDb, mockListings } from '@/mocks/db/listings'
import { renderWithProviders } from '@/test/utils'
import type { MediaRef, OwnListing } from '@/types/api'

async function openTab(tab?: string) {
  const utils = renderWithProviders(routes, { initialPath: `/me/listings${tab ? `?tab=${tab}` : ''}` })
  await screen.findByRole('heading', { level: 1, name: 'My listings' })
  return utils
}

const rows = async () => within(await screen.findByRole('list', { name: /listings$/ })).getAllByRole('listitem')
const tab = (name: RegExp) => screen.getByRole('link', { name })

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('My listings', () => {
  it('shows Active by default, with a count on every tab', async () => {
    await openTab()

    expect(tab(/^Active/)).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(tab(/^Active/)).toHaveTextContent('3'))
    // The unfinished draft and the one sent back for changes
    expect(tab(/^Draft/)).toHaveTextContent('2')
    expect(await rows()).toHaveLength(3)
  })

  it('keeps the tab in the URL', async () => {
    const { router } = await openTab()

    await userEvent.click(tab(/^Draft/))

    await waitFor(() => expect(router.state.location.search).toBe('?tab=draft'))
    expect(await screen.findByText('PS4 DualShock controller')).toBeInTheDocument()
  })

  it('shows listings under review in Active with their badge', async () => {
    const form = new FormData()
    form.append('file', new File([new Uint8Array(10)], 'p.jpg', { type: 'image/jpeg' }))
    const photo = (await apiClient.post<MediaRef>('/media', form)).data
    const { data: draft } = await apiClient.post<OwnListing>('/listings', {
      title: 'Galaxy S21',
      categoryId: 'home',
      photos: [photo],
      condition: 'GOOD',
      noDefects: true,
      repairs: 'None',
      accessories: 'None',
      ownershipConfirmed: true,
      modes: ['SWAP'],
      openToOffers: true,
      areaId: 'central',
    })
    await apiClient.post(`/listings/${draft.id}/publish`)
    await openTab('active')

    const row = (await rows()).find((r) => r.textContent?.includes('Galaxy S21'))!
    expect(within(row).getByText('Under review')).toBeInTheDocument()
  })

  it('has an empty state for each tab', async () => {
    await openTab('reserved')

    expect(await screen.findByRole('heading', { name: 'No reserved items' })).toBeInTheDocument()
    expect(screen.getByText(/When you accept an offer/)).toBeInTheDocument()
  })

  it('continues or discards a draft, asking before discarding', async () => {
    await openTab('draft')
    const row = (await rows()).find((r) => r.textContent?.includes('PS4 DualShock controller'))

    expect(within(row!).getByRole('link', { name: 'Continue' })).toHaveAttribute(
      'href',
      '/listings/l-draft-sample/edit',
    )
    await userEvent.click(within(row!).getByRole('button', { name: 'Discard' }))
    const dialog = await screen.findByRole('dialog', { name: 'Discard this draft?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Discard draft' }))

    await waitFor(async () => expect(await rows()).toHaveLength(1))
    expect(screen.queryByText('PS4 DualShock controller')).not.toBeInTheDocument()
  })

  it('views, edits and closes an active listing', async () => {
    await openTab('active')
    const row = (await rows()).find((r) => r.textContent?.includes('iPhone 12 Pro'))!

    expect(within(row).getByRole('link', { name: 'View' })).toHaveAttribute('href', '/listings/iphone-12-pro-128gb')
    expect(within(row).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/listings/l1/edit')
    await userEvent.click(within(row).getByRole('button', { name: 'Close' }))
    const dialog = await screen.findByRole('dialog', { name: 'Close this listing?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close listing' }))

    await waitFor(() => expect(tab(/^Active/)).toHaveTextContent('2'))
    expect((await apiClient.get<OwnListing>('/me/listings/l1')).data.status).toBe('CLOSED')
  })

  it('renews an expired listing with Quick Sell (QA-10)', async () => {
    mockListings.expire('l6')
    await openTab('expired')
    const [row] = await rows()

    expect(within(row!).getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(within(row!).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    await userEvent.click(within(row!).getByRole('button', { name: 'Renew' }))
    const sheet = await screen.findByRole('dialog', { name: 'Renew listing' })
    await userEvent.click(within(sheet).getByRole('radio', { name: /Quick Sell for 24 hours/ }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Renew listing' }))

    await waitFor(async () => {
      const { data } = await apiClient.get<OwnListing>('/me/listings/l6')
      expect(data.status).toBe('ACTIVE')
      expect(data.urgencyEndsAt).toBeTruthy()
    })
    expect(await screen.findByRole('heading', { name: 'No expired listings' })).toBeInTheDocument()
  })

  it('keeps closed listings view-only', async () => {
    await apiClient.post('/listings/l1/close')
    await openTab('closed')
    const [row] = await rows()

    expect(within(row!).getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(within(row!).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(row!).queryByRole('button')).not.toBeInTheDocument()
  })

  describe('listings sent back for changes', () => {
    const sampleMessage =
      'The photos are too dark to see the condition of the buttons. Please add two clear photos taken in daylight.'
    const banner = () => screen.queryByText('1 listing needs changes before it can go live.')

    it('tells the seller on Active that a listing needs changes', async () => {
      await openTab()
      await rows()

      expect(banner()).toBeInTheDocument()
      expect(banner()!.closest('[role="status"]')).not.toBeNull()
      expect(screen.getByRole('link', { name: 'See it' })).toHaveAttribute('href', '/me/listings?tab=draft')
    })

    it('shows the listing sent back for changes first in Drafts, with its reason and message', async () => {
      await openTab('draft')
      const [first] = await rows()

      expect(banner()).not.toBeInTheDocument()
      expect(within(first!).getByText('Changes needed')).toBeInTheDocument()
      expect(within(first!).getByText('Nintendo Switch Lite · Coral')).toBeInTheDocument()
      expect(within(first!).getByText('Photos missing or unclear')).toBeInTheDocument()
      expect(within(first!).getByText(sampleMessage)).toBeInTheDocument()
      expect(within(first!).getByText('Message from NextOwn:', { exact: false })).toBeInTheDocument()
      expect(within(first!).getByRole('link', { name: 'Edit and resubmit' })).toHaveAttribute(
        'href',
        `/listings/${CHANGES_SAMPLE_ID}/edit`,
      )
      expect(within(first!).getByRole('button', { name: 'Discard' })).toBeInTheDocument()
      expect(within(first!).queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument()
    })

    it('shows the reason alone when there is no message', async () => {
      listingsDb.change(CHANGES_SAMPLE_ID, {
        review: {
          outcome: 'changes_needed',
          reasonLabel: 'Wrong category',
          message: null,
          decidedAt: new Date().toISOString(),
        },
      })
      await openTab('draft')
      const [first] = await rows()

      expect(within(first!).getByText('Wrong category')).toBeInTheDocument()
      expect(within(first!).queryByText('Message from NextOwn:', { exact: false })).not.toBeInTheDocument()
    })

    it('says a resubmitted listing is being checked again', async () => {
      await apiClient.post(`/listings/${CHANGES_SAMPLE_ID}/publish`)
      await openTab()
      const row = (await rows()).find((r) => r.textContent?.includes('Nintendo Switch Lite · Coral'))!

      expect(within(row).getByText('Resubmitted. We’re checking it again.')).toBeInTheDocument()
      expect(banner()).not.toBeInTheDocument()
    })

    it('removes the banner once the draft is discarded', async () => {
      await openTab('draft')
      const [first] = await rows()

      await userEvent.click(within(first!).getByRole('button', { name: 'Discard' }))
      const dialog = await screen.findByRole('dialog', { name: 'Discard this draft?' })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Discard draft' }))
      await waitFor(async () => expect(await rows()).toHaveLength(1))
      await userEvent.click(tab(/^Active/))
      await rows()

      expect(banner()).not.toBeInTheDocument()
    })
  })
})

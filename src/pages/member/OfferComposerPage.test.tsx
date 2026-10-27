import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { listingsDb } from '@/mocks/db/listings'
import { mockOffers } from '@/mocks/db/offers'
import { renderWithProviders } from '@/test/utils'
import type * as Compress from '@/lib/images/compress'
import type { Offer } from '@/types/api'

vi.mock('@/lib/images/compress', async (original) => ({
  ...(await original<typeof Compress>()),
  // jsdom has no canvas: hand the file straight through
  preparePhoto: (file: File) => Promise.resolve({ blob: file, width: 1600, height: 1200 }),
}))

// iPad 9th gen · 64GB: Zainab's, takes cash and swaps, asking ₦230,000
const IPAD = 'l8'
const IPAD_TITLE = 'iPad 9th gen · 64GB'

async function open(listingId: string, step?: string) {
  const utils = renderWithProviders(routes, {
    initialPath: `/offers/new?listing=${listingId}${step ? `&step=${step}` : ''}`,
  })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

const radio = (name: RegExp | string) => screen.getByRole('radio', { name })
const continueButton = () => screen.getByRole('button', { name: 'Continue' })

async function choose(mode: RegExp) {
  await userEvent.click(await screen.findByRole('radio', { name: mode }))
  await userEvent.click(continueButton())
}

async function cashToReview(naira = '200000') {
  await choose(/^Cash offer/)
  await userEvent.type(await screen.findByLabelText('Your offer'), naira)
  await userEvent.click(continueButton())
  await screen.findByRole('heading', { name: 'Check your offer' })
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Offer composer: choosing the kind of offer (FE-OFF-01)', () => {
  it('offers only the kinds the listing accepts, and says why the others are off', async () => {
    // iPhone 12 Pro Max is cash only
    await open('l4')

    expect(await screen.findByRole('radio', { name: /^Cash offer/ })).toBeEnabled()
    expect(radio(/^Swap an item/)).toBeDisabled()
    expect(radio(/^Swap \+ cash/)).toBeDisabled()
    expect(screen.getAllByText('The owner isn’t taking swaps for this item.')).toHaveLength(2)
  })

  it('pins the listing being offered for', async () => {
    await open(IPAD)

    const pin = await screen.findByRole('region', { name: 'Offering for' })
    expect(within(pin).getByText(IPAD_TITLE)).toBeInTheDocument()
    expect(within(pin).getByText('₦230,000')).toBeInTheDocument()
  })

  it('blocks an offer on your own listing', async () => {
    await open('l1')

    expect(screen.getByRole('heading', { level: 1, name: 'This is your listing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage listing' })).toHaveAttribute('href', '/listings/l1/edit')
  })

  it('blocks an offer on an item that is no longer available', async () => {
    await open('l10')

    expect(screen.getByRole('heading', { level: 1, name: 'This item isn’t taking offers' })).toBeInTheDocument()
    expect(screen.getByText('Reserved: this item is no longer accepting offers.')).toBeInTheDocument()
  })

  it('blocks a restricted account with a way to ask for a review', async () => {
    mockAuth.setRestricted(true)
    await open(IPAD)

    expect(await screen.findByRole('heading', { level: 1, name: 'Your account can’t make offers right now' }))
    expect(screen.getByRole('link', { name: 'Ask for a review' })).toBeInTheDocument()
  })

  it('points to the open offer you already have on the item', async () => {
    await open('l9')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'You already have an offer on this item' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your offer' })).toHaveAttribute('href', '/offers/o-ps4-counter')
  })
})

describe('Offer composer: cash (FE-OFF-02, FE-OFF-05)', () => {
  it('has no payer choice, refuses ₦0 and writes the offer as a sentence', async () => {
    await open(IPAD)
    await choose(/^Cash offer/)

    const amount = await screen.findByLabelText('Your offer')
    expect(screen.queryByRole('radio', { name: /I add cash/ })).not.toBeInTheDocument()
    await userEvent.type(amount, '0')
    await userEvent.click(continueButton())
    expect(await screen.findAllByText('Enter an amount above ₦0.')).not.toHaveLength(0)

    await userEvent.clear(screen.getByLabelText('Your offer'))
    await userEvent.type(screen.getByLabelText('Your offer'), '200000')
    expect(screen.getByText(`You would pay ₦200,000 to receive the ${IPAD_TITLE}.`)).toBeInTheDocument()
  })

  it('reviews both sides with the required notices, then sends and opens the offer', async () => {
    const { router } = await open(IPAD)
    await cashToReview()

    expect(screen.getByRole('region', { name: 'You give' })).toHaveTextContent('₦200,000')
    expect(screen.getByRole('region', { name: 'You receive' })).toHaveTextContent(IPAD_TITLE)
    expect(screen.getAllByText('You pay ₦200,000 directly at the exchange.').length).toBeGreaterThan(0)
    expect(screen.getByText(copy.beforeSend)).toBeInTheDocument()
    expect(screen.getByText('This is an offer, not a completed transaction.')).toBeInTheDocument()
    expect(screen.getByText(copy.handoverCaution)).toBeInTheDocument()
    expect(screen.getByText(/If Zainab M\. doesn’t answer, this offer expires/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Send offer' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/offers\/o-/))
    const sent = (await apiClient.get<Offer[]>('/offers')).data.find((o) => o.listing.id === IPAD)!
    expect(sent.versions[0]).toMatchObject({ mode: 'CASH', cashKobo: 20_000_000, cashDirection: 'OFFERER_PAYS_OWNER' })
  })

  it('keeps the draft when the item became unavailable before sending', async () => {
    await open(IPAD)
    await cashToReview()
    listingsDb.setStatus(IPAD, 'RESERVED')

    await userEvent.click(screen.getByRole('button', { name: 'Send offer' }))

    expect(await screen.findByText(copy.unavailable)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See similar items' })).toHaveAttribute('href', '/explore?category=laptops')
    expect(screen.getByRole('region', { name: 'You give' })).toHaveTextContent('₦200,000')
  })

  it('checks the latest status when the answer is lost, then opens the sent offer (QA-21)', async () => {
    const { router } = await open(IPAD)
    await cashToReview()
    mockOffers.saveThenFailNext()

    await userEvent.click(screen.getByRole('button', { name: 'Send offer' }))

    expect(await screen.findByText('Checking the latest status…')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/offers\/o-/))
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
  })

  it('brings the draft back after a reload', async () => {
    const first = await open(IPAD)
    await cashToReview('185000')
    first.unmount()

    await open(IPAD, 'review')

    expect(await screen.findByRole('region', { name: 'You give' })).toHaveTextContent('₦185,000')
  })
})

describe('Offer composer: swaps (FE-OFF-03, FE-OFF-04)', () => {
  it('picks one of your items, with reserved ones disabled and explained', async () => {
    // Accepting Chidi's offer reserves Tolu's iPhone
    const offer = (await apiClient.get<Offer>('/offers/o-macbook-for-iphone')).data
    await apiClient.post(
      `/offers/${offer.id}/accept`,
      { expectedVersionId: offer.versions.at(-1)!.id },
      { headers: idempotencyHeaders('accept-1') },
    )
    const { router } = await open(IPAD)
    await choose(/^Swap an item/)

    const iphone = await screen.findByRole('radio', { name: /iPhone 12 Pro · 128GB/ })
    expect(iphone).toBeDisabled()
    expect(within(iphone.closest('label')!).getByText('Reserved for another deal')).toBeInTheDocument()

    await userEvent.click(radio(/MacBook Air M1 · Space Grey/))
    await userEvent.click(continueButton())

    expect(
      await screen.findByText(`You offer your MacBook Air M1 · Space Grey. They give you the ${IPAD_TITLE}.`),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send offer' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/offers\/o-/))
  })

  it('adds a private offer-only item and selects it', async () => {
    await open(IPAD)
    await choose(/^Swap an item/)
    await userEvent.click(await screen.findByRole('button', { name: 'Add an item' }))

    expect(screen.getByText('Only the person you’re offering to can see this item.')).toBeInTheDocument()
    await userEvent.upload(
      screen.getByLabelText('Add photos', { selector: 'input' }),
      new File([new Uint8Array(500)], 'phone.jpg', { type: 'image/jpeg' }),
    )
    await userEvent.type(screen.getByLabelText('Title'), 'Galaxy S21 · 128GB')
    await userEvent.click(screen.getByRole('radio', { name: /^Good/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'No defects to disclose' }))
    await userEvent.type(screen.getByLabelText('Repairs'), 'None')
    await userEvent.click(screen.getByRole('checkbox', { name: /belongs to me/ }))
    await waitFor(() => expect(screen.getByText('1 of 8 photos')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Use this item' }))

    const created = await screen.findByRole('radio', { name: /Galaxy S21 · 128GB/ })
    expect(created).toBeChecked()
    expect(within(created.closest('label')!).getByText('Only visible in offers')).toBeInTheDocument()
  })

  it('needs a direction for swap + cash, says who pays, and suggests Swap at ₦0 (QA-03)', async () => {
    await open(IPAD)
    await choose(/^Swap \+ cash/)
    await userEvent.click(await screen.findByRole('radio', { name: /Table-top blender/ }))
    await userEvent.click(continueButton())

    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(await screen.findAllByText('Choose who adds the cash.')).not.toHaveLength(0)

    await userEvent.click(radio(/^I receive cash/))
    await userEvent.type(screen.getByLabelText('Cash amount'), '50000')
    expect(
      screen.getByText(
        `You offer your Table-top blender and grinder. They give you the ${IPAD_TITLE} and pay you ₦50,000.`,
      ),
    ).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Cash amount'))
    await userEvent.type(screen.getByLabelText('Cash amount'), '0')
    await userEvent.click(continueButton())
    expect(await screen.findAllByText('Enter an amount above ₦0, or switch to Swap.')).not.toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Switch to Swap' }))
    await screen.findByRole('heading', { name: 'Check your offer' })
    expect(screen.getAllByText('No cash changes hands.').length).toBeGreaterThan(0)
  })
})

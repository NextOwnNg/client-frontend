import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockOffers } from '@/mocks/db/offers'
import { renderWithProviders } from '@/test/utils'
import type { Offer } from '@/types/api'

async function openThread(id: string) {
  const utils = renderWithProviders(routes, { initialPath: `/offers/${id}` })
  await screen.findByRole('region', { name: 'Offer history' })
  return utils
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const history = () => within(screen.getByRole('region', { name: 'Offer history' })).getAllByRole('listitem')
const latestOf = async (id: string) => (await apiClient.get<Offer>(`/offers/${id}`)).data

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Offer thread: history and roles (FE-OFF-07)', () => {
  it('lists every version read-only, highlights the latest, and acts only on it', async () => {
    await openThread('o-ps4-counter')

    const versions = history()
    expect(versions).toHaveLength(2)
    expect(within(versions[0]!).getByText(/Version 1 · You offered/)).toBeInTheDocument()
    expect(within(versions[1]!).getByText(/Version 2 · Ibrahim S\. countered/)).toBeInTheDocument()
    expect(within(versions[1]!).getByText('Latest')).toBeInTheDocument()
    expect(within(versions[0]!).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1)
  })

  it('gives the owner whose turn it is Accept, Counter and Decline', async () => {
    await openThread('o-macbook-for-iphone')

    expect(button('Accept')).toBeInTheDocument()
    expect(button('Counter')).toBeInTheDocument()
    expect(button('Decline')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument()
  })

  it('lets the offerer who is waiting withdraw, and nothing else', async () => {
    await openThread('o-switch-waiting')

    expect(screen.getByText('Waiting for Zainab M. to decide.')).toBeInTheDocument()
    expect(button('Withdraw offer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('shows the terms from the reader’s side, with who pays whom (QA-03)', async () => {
    await openThread('o-macbook-for-iphone')

    expect(
      screen.getAllByText(
        'They offer their MacBook Air M1, 2020. You give them your iPhone 12 Pro · 128GB and pay them ₦200,000.',
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('region', { name: 'You give' })).toHaveTextContent('₦200,000')
  })

  it('hides an offer from anyone outside it (QA-16)', async () => {
    mockAuth.signInAs('u-zainab')
    renderWithProviders(routes, { initialPath: '/offers/o-macbook-for-iphone' })

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that offer' })).toBeInTheDocument()
  })
})

describe('Offer thread: decisions (FE-OFF-08, FE-OFF-09)', () => {
  it('confirms the full terms before accepting, then shows the reserved deal', async () => {
    await openThread('o-macbook-for-iphone')

    await userEvent.click(button('Accept'))
    const sheet = await screen.findByRole('dialog', { name: 'Accept this offer?' })
    expect(
      within(sheet).getByText(
        'They offer their MacBook Air M1, 2020. You give them your iPhone 12 Pro · 128GB and pay them ₦200,000.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Accept offer' }))

    expect(await screen.findByText(copy.offerAccepted)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View the agreement' })).toHaveAttribute(
      'href',
      '/transactions/t-o-macbook-for-iphone',
    )
    expect((await latestOf('o-macbook-for-iphone')).status).toBe('ACCEPTED')
  })

  it('refuses to accept terms that changed underneath, and shows what changed (QA-04)', async () => {
    await openThread('o-ps4-counter')
    // Meanwhile, on another device: Tolu counters, then Ibrahim counters back
    const offer = await latestOf('o-ps4-counter')
    await apiClient.post(
      '/offers/o-ps4-counter/counter',
      { ...offer.versions.at(-1)!, expectedVersionId: offer.versions.at(-1)!.id, cashKobo: 17_000_000 },
      { headers: idempotencyHeaders('other-device') },
    )
    mockOffers.otherPartyCounters('o-ps4-counter')

    await userEvent.click(button('Accept'))
    const sheet = await screen.findByRole('dialog', { name: 'Accept this offer?' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Accept offer' }))

    expect(await screen.findByText(copy.staleVersion)).toBeInTheDocument()
    const changes = screen.getByRole('region', { name: 'What changed' })
    expect(within(changes).getByText('₦195,000')).toBeInTheDocument()
    expect((await latestOf('o-ps4-counter')).status).toBe('PENDING')
    await waitFor(() => expect(history()).toHaveLength(4))
  })

  it('counters with the current terms filled in, and passes the turn', async () => {
    await openThread('o-ps4-counter')

    await userEvent.click(button('Counter'))
    const sheet = await screen.findByRole('dialog', { name: 'Make a counteroffer' })
    const amount = within(sheet).getByLabelText('Cash amount')
    expect(amount).toHaveValue('195,000')
    await userEvent.clear(amount)
    await userEvent.type(amount, '180000')
    expect(within(sheet).getByText('You would pay ₦15,000 less.')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send counteroffer' }))

    await waitFor(() => expect(history()).toHaveLength(3))
    expect(screen.getByText('Waiting for Ibrahim S. to decide.')).toBeInTheDocument()
    expect((await latestOf('o-ps4-counter')).versions.at(-1)!.cashKobo).toBe(18_000_000)
  })

  it('asks before declining', async () => {
    await openThread('o-ps5-for-macbook')

    await userEvent.click(button('Decline'))
    const dialog = await screen.findByRole('dialog', { name: 'Decline this offer?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Decline offer' }))

    await waitFor(async () => expect((await latestOf('o-ps5-for-macbook')).status).toBe('REJECTED'))
    expect(await screen.findByText('You declined this offer.')).toBeInTheDocument()
  })

  it('checks the latest status when an accept’s answer is lost, then shows it accepted (QA-21)', async () => {
    await openThread('o-macbook-for-iphone')
    mockOffers.saveThenFailNext()

    await userEvent.click(button('Accept'))
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Accept this offer?' })).getByRole('button', {
        name: 'Accept offer',
      }),
    )

    expect(await screen.findByText('Checking the latest status…')).toBeInTheDocument()
    expect(await screen.findByText(copy.offerAccepted)).toBeInTheDocument()
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
  })
})

describe('Offer thread: comparison and closed states (FE-OFF-10..12)', () => {
  it('compares a counter with the version before it, in words', async () => {
    await openThread('o-ps4-counter')

    const changes = screen.getByRole('region', { name: 'What changed' })
    expect(within(changes).getByText('₦170,000')).toBeInTheDocument()
    expect(within(changes).getByText('₦195,000')).toBeInTheDocument()
    expect(within(changes).getByText('You would pay ₦25,000 more.')).toBeInTheDocument()
  })

  it('turns read-only once the offer expires (QA-09)', async () => {
    mockOffers.expire('o-ps4-counter')
    await openThread('o-ps4-counter')

    expect(screen.getAllByText('Offer expired').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('explains an offer closed by another acceptance (FE-OFF-11)', async () => {
    mockOffers.closeByOtherAcceptance('o-switch-waiting')
    await openThread('o-switch-waiting')

    expect(screen.getAllByText('No longer available').length).toBeGreaterThan(0)
    expect(screen.getByText('The owner accepted another offer.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument()
  })
})

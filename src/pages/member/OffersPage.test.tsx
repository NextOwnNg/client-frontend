import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockOffers } from '@/mocks/db/offers'
import { renderWithProviders } from '@/test/utils'

async function openInbox(tab?: string) {
  const utils = renderWithProviders(routes, { initialPath: `/offers${tab ? `?tab=${tab}` : ''}` })
  await screen.findByRole('heading', { level: 1, name: 'Offers' })
  return utils
}

const tab = (name: RegExp) => screen.getByRole('link', { name })
const cards = async () => within(await screen.findByRole('list', { name: /offers$/ })).getAllByRole('listitem')
const card = async (title: RegExp) => (await cards()).find((c) => title.test(c.textContent ?? ''))!

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))
afterEach(() => vi.useRealTimers())

describe('Offers inbox (FE-OFF-06, UX-19)', () => {
  it('shows Received by default, with a count on every tab', async () => {
    await openInbox()

    expect(tab(/^Received/)).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(tab(/^Received/)).toHaveTextContent('2'))
    expect(tab(/^Sent/)).toHaveTextContent('2')
    expect(tab(/^Awaiting handover/)).toHaveTextContent('1')
    expect(tab(/^Closed/)).toHaveTextContent('2')
    expect(await cards()).toHaveLength(2)
  })

  it('keeps the tab in the URL', async () => {
    const { router } = await openInbox()

    await userEvent.click(tab(/^Sent/))

    await waitFor(() => expect(router.state.location.search).toBe('?tab=sent'))
    expect(await card(/PS4 · 500GB/)).toBeInTheDocument()
  })

  it('shows the item, the terms from your side, whose turn it is, the expiry and unread', async () => {
    await openInbox()
    const ps5 = await card(/MacBook Air M1 · Space Grey/)

    expect(within(ps5).getByText('Swap + cash')).toBeInTheDocument()
    expect(within(ps5).getByText('They pay you ₦150,000')).toBeInTheDocument()
    expect(within(ps5).getByText('Your turn')).toBeInTheDocument()
    expect(within(ps5).getByText(/^Expires in \d+ days$/)).toBeInTheDocument()
    expect(within(ps5).getByText('New')).toBeInTheDocument()
    expect(within(ps5).getByRole('link')).toHaveAttribute('href', '/offers/o-ps5-for-macbook?tab=received')
  })

  it('says who you are waiting on, and marks a counter that needs you', async () => {
    await openInbox('sent')

    expect(within(await card(/Nintendo Switch/)).getByText('Waiting for Zainab M.')).toBeInTheDocument()
    const ps4 = await card(/PS4 · 500GB/)
    expect(within(ps4).getByText('Your turn')).toBeInTheDocument()
    expect(within(ps4).getByText('Counteroffer received')).toBeInTheDocument()
    expect(within(ps4).getByText('You pay ₦195,000')).toBeInTheDocument()
  })

  it('lists closed offers with what happened', async () => {
    await openInbox('closed')

    const tecno = await card(/Tecno Camon CX/)
    expect(within(tecno).getByText('Declined')).toBeInTheDocument()
    expect(within(tecno).queryByText(/Expires/)).not.toBeInTheDocument()
  })

  it('has an empty state for a tab with nothing in it', async () => {
    mockAuth.signInAs('u-amaka')
    await openInbox('received')

    expect(await screen.findByRole('heading', { name: 'No offers received' })).toBeInTheDocument()
  })

  it('picks up the other person’s move on its next poll', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await openInbox('sent')
    expect(within(await card(/Nintendo Switch/)).getByText('Waiting for Zainab M.')).toBeInTheDocument()

    mockOffers.otherPartyCounters('o-switch-waiting')
    await act(() => vi.advanceTimersByTimeAsync(31_000))

    await waitFor(async () => expect(within(await card(/Nintendo Switch/)).getByText('Your turn')).toBeInTheDocument())
  })
})

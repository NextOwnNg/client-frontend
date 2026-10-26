import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockTransactions } from '@/mocks/db/transactions'
import { renderWithProviders } from '@/test/utils'

async function openList(tab?: string) {
  const utils = renderWithProviders(routes, { initialPath: `/transactions${tab ? `?tab=${tab}` : ''}` })
  await screen.findByRole('heading', { level: 1, name: 'Transactions' })
  return utils
}

const tab = (name: RegExp) => screen.getByRole('link', { name })
const cards = async () => within(await screen.findByRole('list', { name: /deals$/ })).getAllByRole('listitem')

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Transactions list', () => {
  it('shows active deals first, with a count on every tab', async () => {
    await openList()

    expect(tab(/^Active/)).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(tab(/^Active/)).toHaveTextContent('1'))
    expect(tab(/^Completed/)).toHaveTextContent('1')
    expect(tab(/^Ended/)).toHaveTextContent('0')
  })

  it('says where each deal stands and what comes next', async () => {
    await openList()
    const [xbox] = await cards()

    expect(within(xbox!).getByText('Xbox Series X · 1TB')).toBeInTheDocument()
    expect(within(xbox!).getByText('Awaiting handover')).toBeInTheDocument()
    expect(within(xbox!).getByText('Next: agree where to meet')).toBeInTheDocument()
    expect(within(xbox!).getByRole('link')).toHaveAttribute('href', '/transactions/t-o-xbox-accepted')
  })

  it('asks for your confirmation when the other person has confirmed', async () => {
    mockTransactions.otherPartyConfirms('t-o-xbox-accepted')
    await openList()
    const [xbox] = await cards()

    expect(within(xbox!).getByText('Waiting for your confirmation')).toBeInTheDocument()
    expect(within(xbox!).getByText('Next: confirm your side')).toBeInTheDocument()
  })

  it('invites a review on a completed deal, and keeps the tab in the URL', async () => {
    const { router } = await openList()

    await userEvent.click(tab(/^Completed/))

    await waitFor(() => expect(router.state.location.search).toBe('?tab=completed'))
    const [ipad] = await cards()
    expect(within(ipad!).getByText('Next: review Ibrahim S.')).toBeInTheDocument()
  })

  it('has an empty state for a tab with nothing in it', async () => {
    await openList('ended')

    expect(await screen.findByRole('heading', { name: 'No ended deals' })).toBeInTheDocument()
  })
})

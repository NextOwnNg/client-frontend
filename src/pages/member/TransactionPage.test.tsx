import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockTransactions } from '@/mocks/db/transactions'
import { renderWithProviders } from '@/test/utils'
import type { ListingDetail } from '@/types/api'

const XBOX = 't-o-xbox-accepted'
const HANDOVER =
  'Inspect the items before exchanging. Payment is arranged directly between you and the other person. NextOwn does not hold or independently verify payment in this pilot.'

async function openDeal(id = XBOX) {
  const utils = renderWithProviders(routes, { initialPath: `/transactions/${id}` })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const confirmViaApi = () =>
  apiClient.post(
    `/transactions/${XBOX}/confirm`,
    { checks: ['received', 'cash'] },
    { headers: idempotencyHeaders('c1') },
  )

async function confirmInSheet() {
  await userEvent.click(button('Confirm my side'))
  const sheet = await screen.findByRole('dialog', { name: 'Confirm your side' })
  await userEvent.click(within(sheet).getByRole('checkbox', { name: /I inspected and received Xbox Series X/ }))
  await userEvent.click(within(sheet).getByRole('checkbox', { name: /I paid ₦570,000 to Chidi O\./ }))
  await userEvent.click(within(sheet).getByRole('button', { name: 'Confirm my side of exchange' }))
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Transaction page: the agreement (FE-TRX-01..04)', () => {
  it('opens with "Offer accepted", the deal’s ID and its status', async () => {
    await openDeal()

    expect(screen.getByRole('heading', { level: 1, name: 'Offer accepted' })).toBeInTheDocument()
    expect(screen.getByText(`Transaction ${XBOX}`)).toBeInTheDocument()
    expect(screen.getAllByText('Awaiting handover').length).toBeGreaterThan(0)
  })

  it('shows the terms as agreed, even after the listing is edited (QA-08)', async () => {
    mockAuth.signInAs('u-chidi')
    await apiClient.patch('/listings/l10', { askingKobo: 99_000_000 })
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await openDeal()

    expect(screen.getAllByText('You pay ₦570,000 directly at the exchange.').length).toBeGreaterThan(0)
    expect(screen.queryByText('₦990,000')).not.toBeInTheDocument()
    expect((await apiClient.get<ListingDetail>('/listings/l10')).data.askingKobo).toBe(99_000_000)
  })

  it('follows the server’s progress, and always shows the handover notice', async () => {
    await openDeal()

    const steps = within(screen.getByRole('list', { name: 'Deal progress' })).getAllByRole('listitem')
    expect(steps[0]).toHaveTextContent('Check terms, done')
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText(HANDOVER)).toBeInTheDocument()
  })

  it('suggests a meeting, which waits for the other person', async () => {
    await openDeal()

    await userEvent.click(button('Suggest a time and place'))
    await userEvent.type(screen.getByLabelText('Place'), 'Central mall, main entrance')
    fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: '2027-01-15T15:00' } })
    await userEvent.click(button('Send suggestion'))

    expect(await screen.findByText('Waiting for Chidi O. to agree.')).toBeInTheDocument()
    expect(screen.getByText('Central mall, main entrance')).toBeInTheDocument()
    expect(screen.getByText('Only the two of you can see this.')).toBeInTheDocument()
  })

  it('agrees to the other person’s suggestion and ticks the meeting step', async () => {
    mockTransactions.otherPartyProposesMeeting(XBOX)
    await openDeal()

    await userEvent.click(button('Agree to this'))

    expect(await screen.findByText('Agreed by both of you')).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Deal progress' })).getAllByRole('listitem')
    expect(steps[1]).toHaveTextContent('Arrange meeting, done')
  })

  it('hides a deal from anyone outside it (QA-16)', async () => {
    mockAuth.signInAs('u-zainab')
    renderWithProviders(routes, { initialPath: `/transactions/${XBOX}` })

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that deal' })).toBeInTheDocument()
  })
})

describe('Transaction page: confirming (FE-TRX-05..07)', () => {
  it('needs every statement before confirming, then waits calmly for the other person (QA-11)', async () => {
    await openDeal()

    await userEvent.click(button('Confirm my side'))
    const sheet = await screen.findByRole('dialog', { name: 'Confirm your side' })
    const submit = within(sheet).getByRole('button', { name: 'Confirm my side of exchange' })
    expect(submit).toBeDisabled()
    expect(within(sheet).getByText(/This is your own statement/)).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /I inspected and received Xbox Series X/ }))
    expect(submit).toBeDisabled()
    await userEvent.click(within(sheet).getByRole('checkbox', { name: /I paid ₦570,000 to Chidi O\./ }))
    await userEvent.click(submit)

    expect(await screen.findByText(copy.partialConfirmation)).toBeInTheDocument()
    expect(screen.getAllByText('Your confirmation received').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /Review/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm my side' })).not.toBeInTheDocument()
  })

  it('shows the completed record only once both people confirm (QA-12)', async () => {
    await confirmViaApi()
    mockTransactions.otherPartyConfirms(XBOX)
    await openDeal()

    expect(screen.getByRole('heading', { level: 1, name: 'Exchange completed' })).toBeInTheDocument()
    const record = screen.getByRole('region', { name: 'Exchange record' })
    expect(within(record).getByText(/Both people confirmed the exchange/)).toBeInTheDocument()
    expect(within(record).getByText(/Tolu A\. \(you\) confirmed/)).toBeInTheDocument()
    expect(within(record).getByText(/Chidi O\. confirmed/)).toBeInTheDocument()
    expect(within(record).queryByText(/verified/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review Chidi O.' })).toHaveAttribute(
      'href',
      `/transactions/${XBOX}/review`,
    )
    expect(button('Print or save')).toBeInTheDocument()
  })

  it('checks the latest status when a confirmation’s answer is lost (QA-21)', async () => {
    await openDeal()
    mockTransactions.saveThenFailNext()

    await confirmInSheet()

    expect(await screen.findByText('Checking the latest status…')).toBeInTheDocument()
    expect(await screen.findByText(copy.partialConfirmation)).toBeInTheDocument()
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
  })
})

describe('Transaction page: ways out (FE-TRX-08, FE-TRX-09, UX-23)', () => {
  it('asks to cancel with a reason, and can withdraw the request', async () => {
    await openDeal()

    await userEvent.click(button('Ask to cancel'))
    const sheet = await screen.findByRole('dialog', { name: 'Ask to cancel?' })
    await userEvent.click(within(sheet).getByRole('radio', { name: /I can’t meet/ }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText('You asked to cancel')).toBeInTheDocument()
    await userEvent.click(button('Withdraw request'))
    await waitFor(() => expect(screen.queryByText('You asked to cancel')).not.toBeInTheDocument())
  })

  it('cancels when the reader agrees to the other person’s request, releasing the items', async () => {
    mockTransactions.otherPartyRequestsCancel(XBOX)
    await openDeal()

    expect(screen.getByText('Chidi O. asked to cancel')).toBeInTheDocument()
    await userEvent.click(button('Agree to cancel'))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this deal?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel deal' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Deal cancelled' })).toBeInTheDocument()
    expect((await apiClient.get<ListingDetail>('/listings/l10')).data.status).toBe('ACTIVE')
  })

  it('keeps the deal when the reader says so', async () => {
    mockTransactions.otherPartyRequestsCancel(XBOX)
    await openDeal()

    await userEvent.click(button('Keep the deal'))

    await waitFor(() => expect(screen.queryByText('Chidi O. asked to cancel')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: 'Offer accepted' })).toBeInTheDocument()
  })

  it('offers only Report a problem once someone has confirmed (ruling R5-3)', async () => {
    await confirmViaApi()
    await openDeal()

    expect(screen.queryByRole('button', { name: 'Ask to cancel' })).not.toBeInTheDocument()
    expect(button('Report a problem')).toBeInTheDocument()
  })

  it('reports a problem with a case reference, then freezes the deal (QA-13)', async () => {
    await openDeal()

    await userEvent.click(button('Report a problem'))
    const sheet = await screen.findByRole('dialog', { name: 'Report a problem' })
    expect(within(sheet).getByText(/emergency services/)).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send report' }))
    expect(await within(sheet).findByText('Choose what went wrong.')).toBeInTheDocument()

    await userEvent.click(within(sheet).getByRole('radio', { name: /They didn’t show up/ }))
    await userEvent.type(
      within(sheet).getByLabelText('What happened?'),
      'We agreed on Saturday at 3pm and they never came.',
    )
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send report' }))

    expect(
      await within(sheet).findByText(
        /^We have recorded your report\. Your case reference is NX-\d{6}\. Support will review the information\.$/,
      ),
    ).toBeInTheDocument()
    expect(within(sheet).getByText(copy.supportLimit)).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Done' }))

    expect(screen.getAllByText('Under review').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Confirm my side' })).not.toBeInTheDocument()
  })

  it('warns in the reservation’s last two days', async () => {
    mockTransactions.nearlyEnd(XBOX)
    await openDeal()

    expect(screen.getByText(/The reservation ends in (19|20)h/)).toBeInTheDocument()
  })

  it('ends an unconfirmed reservation without ever calling it complete (QA-14)', async () => {
    mockTransactions.endReservation(XBOX)
    await openDeal()

    expect(screen.getByRole('heading', { level: 1, name: 'Reservation ended' })).toBeInTheDocument()
    expect(screen.getByText(/Neither person confirmed/)).toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('sends a half-confirmed reservation to support, with a way to get help (QA-15)', async () => {
    await confirmViaApi()
    mockTransactions.endReservation(XBOX)
    await openDeal()

    expect(screen.getByText(/Support will review the deal/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact support' })).toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })
})

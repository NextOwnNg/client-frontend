import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { BlockedPerson, CaseReport } from '@/types/api'

async function open(path: string) {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

const send = () => userEvent.click(screen.getByRole('button', { name: 'Send report' }))

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Report (FE-TRU-01, UX-23)', () => {
  it('names what is reported, puts danger guidance first, and states what support can do', async () => {
    await open('/report/listing/l3')

    expect(screen.getByRole('heading', { level: 1, name: 'Report this listing' })).toBeInTheDocument()
    expect(screen.getByText('PS5 Disc Edition')).toBeInTheDocument()
    expect(screen.getByText(/If you’re in danger now/)).toBeInTheDocument()
    expect(screen.getByText(copy.supportLimit)).toBeInTheDocument()
    const rules = screen.getByRole('list', { name: 'Rules and safety' })
    expect(within(rules).getByRole('link', { name: 'Community rules' })).toHaveAttribute('href', '/community-rules')
  })

  it('needs a reason, and words for "Something else"', async () => {
    await open('/report/listing/l3')

    await send()
    expect(await screen.findByText('Choose what’s wrong.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Something else/ }))
    await send()
    expect(await screen.findByText('Tell us what happened in a sentence or two.')).toBeInTheDocument()
  })

  it('shows the case reference once received, and lists it in My reports', async () => {
    await open('/report/listing/l3')

    await userEvent.click(screen.getByRole('radio', { name: /Scam or fraud/ }))
    await userEvent.type(screen.getByLabelText(/What happened/), 'Asked me to pay a deposit before meeting.')
    await send()

    const done = await screen.findByText(/^We received report NX-\d{6}\.$/)
    const caseRef = /NX-\d{6}/.exec(done.textContent ?? '')?.[0]
    expect(screen.getByRole('link', { name: 'See my reports' })).toHaveAttribute('href', '/me/reports')
    const cases = (await apiClient.get<CaseReport[]>('/me/reports')).data
    expect(cases[0]).toMatchObject({ caseRef, reason: 'SCAM', targetLabel: 'PS5 Disc Edition' })
  })

  it('returns the open case for a second report of the same thing', async () => {
    const first = await apiClient.post<{ report: CaseReport }>('/reports', {
      targetType: 'listing',
      targetId: 'l3',
      reason: 'SPAM',
      description: '',
      evidenceIds: [],
    })
    await open('/report/listing/l3')

    await userEvent.click(screen.getByRole('radio', { name: /Spam/ }))
    await send()

    expect(
      await screen.findByText(`You already reported this. Your case reference is ${first.data.report.caseRef}.`),
    ).toBeInTheDocument()
  })

  it('can block the author in the same step (ruling R7-3)', async () => {
    await open('/report/comment/c-1')

    expect(screen.getByText('A comment on “Nintendo Switch with dock”')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Harassment or hate/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Also block Amaka N\./ }))
    await send()

    await screen.findByText(/^We received report/)
    expect(screen.getByText(/You blocked Amaka N\./)).toBeInTheDocument()
    await waitFor(async () =>
      expect((await apiClient.get<BlockedPerson[]>('/me/blocks')).data.map((p) => p.id)).toEqual(['u-amaka']),
    )
  })

  it('says so when the thing is gone, with no form', async () => {
    renderWithProviders(routes, { initialPath: '/report/comment/c-3' })

    expect(await screen.findByRole('heading', { name: 'There’s nothing to report here' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send report' })).not.toBeInTheDocument()
  })

  it('reports a person from their profile', async () => {
    await open('/users/u-chidi')

    expect(screen.getByRole('link', { name: 'Report Chidi O.' })).toHaveAttribute('href', '/report/user/u-chidi')
  })
})

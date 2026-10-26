import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { Transaction } from '@/types/api'

const IPAD = 't-o-ipad-completed'
const XBOX = 't-o-xbox-accepted'

async function open(path: string) {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Reviews (FE-TRU-04, UX-24)', () => {
  it('needs a star rating, works from the keyboard, and returns to the record once posted', async () => {
    const { router } = await open(`/transactions/${IPAD}/review`)

    expect(screen.getByRole('heading', { level: 1, name: 'Review Ibrahim S.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))
    expect(await screen.findByText('Choose a rating from 1 to 5 stars.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()
    await userEvent.type(screen.getByLabelText(/Add a few words/), 'On time and exactly as described.')
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/transactions/${IPAD}`))
    const record = await screen.findByRole('region', { name: 'Exchange record' })
    expect(within(record).getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
    expect((await apiClient.get<Transaction>(`/transactions/${IPAD}`)).data.review.mine?.rating).toBe(4)
  })

  it('shows the review gate on a deal that isn’t completed, even from an old link (QA-20)', async () => {
    await apiClient.post(
      `/transactions/${XBOX}/cancellation`,
      { reason: 'CHANGED_MIND' },
      { headers: idempotencyHeaders('c') },
    )
    mockAuth.signInAs('u-chidi')
    await apiClient.post(`/transactions/${XBOX}/cancellation/accept`, {}, { headers: idempotencyHeaders('a') })
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    await open(`/transactions/${XBOX}/review`)

    expect(screen.getByText(copy.reviewGate)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post review' })).not.toBeInTheDocument()
  })

  it('shows the review already left instead of a second form', async () => {
    await apiClient.post(`/transactions/${IPAD}/review`, { rating: 5 }, { headers: idempotencyHeaders('r') })

    await open(`/transactions/${IPAD}/review`)

    expect(screen.getByRole('heading', { level: 1, name: 'You’ve reviewed Ibrahim S.' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '5 out of 5 stars' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post review' })).not.toBeInTheDocument()
  })

  it('lists reviews about the member and by the member', async () => {
    await apiClient.post(
      `/transactions/${IPAD}/review`,
      { rating: 4, note: 'Good.' },
      { headers: idempotencyHeaders('r2') },
    )

    await open('/me/reviews')

    const about = await screen.findByRole('region', { name: 'About you' })
    expect(within(about).getByText(/Paid exactly as agreed/)).toBeInTheDocument()
    expect(within(about).getByText(/Ibrahim S\./)).toBeInTheDocument()
    const by = screen.getByRole('region', { name: 'By you' })
    expect(within(by).getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
    expect(within(by).getByText('iPad · 32GB (older model)')).toBeInTheDocument()
  })
})

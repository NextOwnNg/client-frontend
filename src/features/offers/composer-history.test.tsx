import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'

// iPad 9th gen · 64GB: Zainab's, takes cash and swaps
const IPAD_SLUG = 'ipad-9th-gen-64gb'
const IPAD_TITLE = 'iPad 9th gen · 64GB'
// MacBook Air M1, 2020: Chidi's, shared to the feed
const MACBOOK_TITLE = 'MacBook Air M1, 2020'

async function startOffer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Make an offer' }))
  await screen.findByRole('heading', { level: 1, name: 'Make an offer' })
  // Move a step on, so the composer has more than one history entry
  await user.click(await screen.findByRole('radio', { name: /^Cash offer/ }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByLabelText('Your offer')
}

describe('Leaving the offer composer', () => {
  beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

  it('returns to the listing it came from, and Back then leaves the listing instead of reopening the offer', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes, { initialPath: '/explore' })
    await screen.findByRole('heading', { level: 1, name: 'Explore items' })
    await user.click(await screen.findByRole('link', { name: new RegExp(IPAD_TITLE) }))
    await screen.findByRole('heading', { level: 1, name: IPAD_TITLE })
    await startOffer(user)

    await user.click(screen.getByRole('button', { name: 'Back to the item' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/listings/${IPAD_SLUG}`))
    await screen.findByRole('heading', { level: 1, name: IPAD_TITLE })

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/explore'))
  })

  it('opens the listing from an offer started elsewhere, and Back skips past the offer steps', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes, { initialPath: '/feed' })
    await screen.findAllByRole('article')
    const post = screen.getAllByRole('article').find((a) => within(a).queryByText(MACBOOK_TITLE))!
    await user.click(within(post).getByRole('link', { name: 'Make an offer' }))
    await screen.findByRole('heading', { level: 1, name: 'Make an offer' })
    await user.click(await screen.findByRole('radio', { name: /^Cash offer/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByLabelText('Your offer')

    await user.click(screen.getByRole('button', { name: 'Back to the item' }))
    await screen.findByRole('heading', { level: 1, name: MACBOOK_TITLE })

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/feed'))
  })
})

describe('Back after signing in to make an offer', () => {
  it('never lands on the sign-in page and bounces back into the offer', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes, { initialPath: '/explore' })
    await screen.findByRole('heading', { level: 1, name: 'Explore items' })
    await user.click(await screen.findByRole('link', { name: new RegExp(IPAD_TITLE) }))
    await screen.findByRole('heading', { level: 1, name: IPAD_TITLE })

    // A guest: Make an offer asks them to sign in, then carries on to the offer
    await user.click(screen.getByRole('button', { name: 'Make an offer' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('link', { name: 'Continue with your phone number' }),
    )
    await user.type(await screen.findByRole('textbox', { name: 'Phone number' }), '08030000001')
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    await user.type(await screen.findByRole('textbox', { name: '6-digit code' }), SAMPLE_CODE)
    await user.click(screen.getByRole('button', { name: 'Confirm phone' }))
    await screen.findByRole('heading', { level: 1, name: 'Make an offer' })

    await user.click(screen.getByRole('button', { name: 'Back to the item' }))
    await screen.findByRole('heading', { level: 1, name: IPAD_TITLE })
    await user.click(screen.getByRole('button', { name: 'Back' }))

    // Back passes the sign-in page instead of being sent forward into the offer again
    await waitFor(() => expect(router.state.location.pathname).toBe(`/listings/${IPAD_SLUG}`))
    await user.click(await screen.findByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/explore'))
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'

describe('Profile hub', () => {
  it('shows the member’s own card and the places they manage things', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderWithProviders(routes, { initialPath: '/me' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Tolu A.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phone confirmed' })).toBeInTheDocument()

    const links: [string, string][] = [
      ['My listings', '/me/listings'],
      ['Offers', '/offers'],
      ['Transactions', '/transactions'],
      ['Saved', '/saved'],
      ['Reviews', '/me/reviews'],
      ['Account settings', '/settings'],
      ['Safety and help', '/support'],
    ]
    const nav = screen.getByRole('navigation', { name: 'Your account' })
    for (const [name, href] of links) {
      expect(nav.querySelector(`a[href="${href}"]`)).toHaveTextContent(name)
    }
    expect(screen.getByRole('link', { name: 'See your public profile' })).toHaveAttribute('href', '/users/u-tolu')
  })

  it('gives every page it opens a way back to Profile', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes, { initialPath: '/me' })

    for (const name of [
      'My listings',
      'Offers',
      'Transactions',
      'Saved',
      'Reviews',
      'Account settings',
      'My reports',
      'Safety and help',
    ]) {
      const nav = await screen.findByRole('navigation', { name: 'Your account' })
      await user.click([...nav.querySelectorAll('a')].find((a) => a.textContent?.startsWith(name))!)
      await user.click(await screen.findByRole('link', { name: 'Back to profile' }))
      expect(router.state.location.pathname).toBe('/me')
    }
  })

  it('keeps Offers and Safety and help free of the back link when not opened from Profile', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderWithProviders(routes, { initialPath: '/offers' })
    await screen.findByRole('heading', { level: 1, name: 'Offers' })
    expect(screen.queryByRole('link', { name: 'Back to profile' })).not.toBeInTheDocument()
  })

  it('shows the back link on profile-only pages even when opened directly', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderWithProviders(routes, { initialPath: '/saved' })
    expect(await screen.findByRole('link', { name: 'Back to profile' })).toHaveAttribute('href', '/me')
  })

  it('shows a restricted member the appeal path', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockAuth.setRestricted(true)
    renderWithProviders(routes, { initialPath: '/me' })

    expect(await screen.findByText('Your account is restricted')).toBeInTheDocument()
  })
})

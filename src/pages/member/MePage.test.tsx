import { screen } from '@testing-library/react'
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

  it('shows a restricted member the appeal path', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockAuth.setRestricted(true)
    renderWithProviders(routes, { initialPath: '/me' })

    expect(await screen.findByText('Your account is restricted')).toBeInTheDocument()
  })
})

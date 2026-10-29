import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { SavedIds } from '@/types/api'

describe('app routes', () => {
  it('renders the home page inside the app shell', async () => {
    renderWithProviders(routes)

    expect(await screen.findByRole('heading', { level: 1, name: 'Find your next thing.' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'NextOwn home' })[0]).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Explore items' })).toHaveAttribute('href', '/explore')
  })

  it('renders the not-found page for unknown routes', async () => {
    renderWithProviders(routes, { initialPath: '/does-not-exist' })

    expect(await screen.findByRole('heading', { name: "We couldn't find that page" })).toBeInTheDocument()
  })
})

describe('signing in from where you were (QA-01)', () => {
  const path = (router: { state: { location: { pathname: string; search: string } } }) =>
    router.state.location.pathname + router.state.location.search

  async function signInThroughTheFlow(phoneDigits: string) {
    await userEvent.type(await screen.findByRole('textbox', { name: 'Phone number' }), phoneDigits)
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await userEvent.type(await screen.findByRole('textbox', { name: '6-digit code' }), SAMPLE_CODE)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm phone' }))
  }

  it('returns a guest who tapped Save to the same listing, and saves once', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/listings/ps5-disc-edition' })

    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Continue with your phone number' }))
    await signInThroughTheFlow('0803 000 0001')

    await waitFor(() => expect(path(router)).toBe('/listings/ps5-disc-edition'))
    expect(await screen.findByRole('heading', { level: 1, name: 'PS5 Disc Edition' })).toBeInTheDocument()
    await waitFor(async () => expect((await apiClient.get<SavedIds>('/saved/ids')).data.listings).toContain('l3'))
    expect((await screen.findAllByRole('button', { name: 'Saved' }))[0]).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('')
  })

  it('takes a guest who tapped Make an offer on to the offer screen for that listing', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/listings/ps5-disc-edition' })

    await userEvent.click(await screen.findByRole('button', { name: 'Make an offer' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Continue with your phone number' }))
    await signInThroughTheFlow('0803 000 0001')

    await waitFor(() => expect(router.state.location.pathname).toBe('/offers/new'))
    expect(router.state.location.search).toMatch(/^\?listing=/)
    expect(await screen.findByRole('heading', { name: 'Make an offer' })).toBeInTheDocument()
  })

  it('sends a guest opening a member page to sign in', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/offers' })

    await waitFor(() => expect(path(router)).toBe('/login?next=%2Foffers'))
  })
})

describe('shell for guests and members', () => {
  it('shows a guest a way to sign in, and no member-only icons', async () => {
    renderWithProviders(routes, { initialPath: '/explore' })

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fexplore')
    expect(screen.queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument()
  })

  it('shows a member their messages, notifications and profile', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderWithProviders(routes)

    expect(await screen.findByRole('link', { name: 'Messages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Your profile' })).toHaveAttribute('href', '/me')
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('tells a restricted member why, how to appeal, and blocks new offers', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    mockAuth.setRestricted(true)
    renderWithProviders(routes, { initialPath: '/listings/ps5-disc-edition' })

    expect(await screen.findByText('Your account is restricted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ask for a review' })).toHaveAttribute('href', '/appeal')
    expect(await screen.findByText('Your account can’t make offers right now.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make an offer' })).not.toBeInTheDocument()
  })
})

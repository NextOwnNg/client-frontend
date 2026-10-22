import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { renderWithProviders } from '@/test/utils'

describe('app shell', () => {
  it('has a five-item bottom navigation that marks the current page', async () => {
    renderWithProviders(routes, { initialPath: '/explore' })

    const nav = await screen.findByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent?.trim())).toEqual(['Explore', 'Feed', 'List', 'Offers', 'Profile'])
    expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Feed' })).not.toHaveAttribute('aria-current')
  })

  it('tells people when they go offline', async () => {
    renderWithProviders(routes)
    await screen.findByRole('navigation', { name: 'Main' })

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
      window.dispatchEvent(new Event('offline'))
    })

    expect(await screen.findByText(/You're offline/)).toBeInTheDocument()

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
      window.dispatchEvent(new Event('online'))
    })
    // The banner animates out before it unmounts
    await waitFor(() => expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument())
  })
})

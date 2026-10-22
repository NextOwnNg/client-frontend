import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { renderWithProviders } from '@/test/utils'

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

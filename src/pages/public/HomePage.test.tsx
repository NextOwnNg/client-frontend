import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { useUiStore } from '@/stores/ui'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

afterEach(() => useUiStore.getState().setAreaId(null))

describe('Home', () => {
  it('leads with the promise, a search and the two main actions', async () => {
    renderWithProviders(routes)

    expect(await screen.findByRole('heading', { level: 1, name: 'Find your next thing.' })).toBeInTheDocument()
    expect(screen.getByText('Sell what you no longer need, swap for something better, or add cash to make the exchange work.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore items' })).toHaveAttribute('href', '/explore')
    expect(screen.getAllByRole('link', { name: 'List an item' })[0]).toHaveAttribute('href', '/listings/new')
  })

  it('sends a search to Explore', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes)

    await user.type(await screen.findByRole('searchbox', { name: 'Search items' }), 'ps5{Enter}')

    await waitFor(() => expect(router.state.location.pathname).toBe('/explore'))
    expect(router.state.location.search).toBe('?q=ps5')
  })

  it('links the Sell, Swap and Quick Sell routes to filtered Explore', async () => {
    renderWithProviders(routes)
    const routesNav = await screen.findByRole('navigation', { name: 'Ways to trade' })

    expect(within(routesNav).getByRole('link', { name: /For sale/ })).toHaveAttribute('href', '/explore?mode=cash')
    expect(within(routesNav).getByRole('link', { name: /Open to swap/ })).toHaveAttribute('href', '/explore?mode=swap')
    expect(within(routesNav).getByRole('link', { name: /Quick Sell/ })).toHaveAttribute('href', '/explore?mode=quick-sell')
  })

  it('shows categories from the pilot config', async () => {
    renderWithProviders(routes)
    const nav = await screen.findByRole('navigation', { name: 'Browse by category' })

    expect(await within(nav).findByRole('link', { name: /Gaming/ })).toHaveAttribute('href', '/explore?category=gaming')
  })

  it('shows a worked example of a swap with cash, labelled as an example', async () => {
    renderWithProviders(routes)

    const sum = await screen.findByRole('region', { name: 'Example: a swap with cash added' })
    expect(within(sum).getByText('You pay ₦120,000 directly at the exchange.')).toBeInTheDocument()
  })

  it('asks for an area without ever requesting location', async () => {
    const geolocation = { getCurrentPosition: vi.fn(), watchPosition: vi.fn() }
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
    renderWithProviders(routes)

    expect(await screen.findByRole('heading', { name: 'Recently listed in [Pilot City]' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose your area' })).toBeInTheDocument()
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(geolocation.watchPosition).not.toHaveBeenCalled()
  })

  it('shows recent listings from the selected area', async () => {
    useUiStore.getState().setAreaId('north')
    renderWithProviders(routes)

    expect(await screen.findByRole('heading', { name: 'Recently listed in [Pilot Area] North' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Recent listings' })
    expect(within(list).getByText('MacBook Air M1, 2020')).toBeInTheDocument()
    expect(within(list).queryByText('iPhone 12 Pro · 128GB')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore?area=north')
  })

  it('offers next steps when the area has nothing listed yet', async () => {
    const user = userEvent.setup()
    useUiStore.getState().setAreaId('east')
    server.use(http.get(`${API}/listings`, () => HttpResponse.json({ items: [], nextCursor: null, total: 0 })))
    renderWithProviders(routes)

    expect(await screen.findByRole('heading', { name: 'Nothing listed in [Pilot Area] East yet' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'See all areas' }))

    expect(useUiStore.getState().areaId).toBeNull()
  })

  it('shows skeletons while recent listings load, then a retry if they fail', async () => {
    server.use(http.get(`${API}/listings`, () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 503 }), { once: true }))
    renderWithProviders(routes)

    expect(await screen.findByLabelText('Loading recent listings')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('explains how a trade works without invented numbers', async () => {
    const { container } = renderWithProviders(routes)

    expect(await screen.findByRole('heading', { name: 'How a trade works' })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\d[\d,]*\+? (users|members|trades|sellers|items sold)/i)
  })
})

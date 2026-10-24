import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { useUiStore } from '@/stores/ui'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

afterEach(() => useUiStore.getState().setAreaIds([]))

const renderExplore = (path = '/explore') => renderWithProviders(routes, { initialPath: path })
const results = () => screen.getByRole('list', { name: 'Results' })
const resultTitles = () =>
  within(results())
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)

describe('Explore', () => {
  it('lists available items, newest first, with a count', async () => {
    renderExplore()

    expect(await screen.findByRole('heading', { level: 1, name: 'Explore items' })).toBeInTheDocument()
    expect(await screen.findByText('14 items · newest first')).toBeInTheDocument()
    expect(resultTitles()[0]).toBe('iPhone 12 Pro · 128GB')
    // Reserved, expired, closed and removed listings are not offered as available results
    expect(resultTitles()).not.toContain('Xbox Series X · 1TB')
  })

  it('loads more results on request', async () => {
    const user = userEvent.setup()
    renderExplore()
    await screen.findByText('14 items · newest first')
    expect(resultTitles()).toHaveLength(12)

    await user.click(screen.getByRole('button', { name: 'Show more' }))

    await waitFor(() => expect(resultTitles()).toHaveLength(14))
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('searches by keyword and keeps the search in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')

    await user.type(screen.getByRole('combobox', { name: 'Search items' }), 'macbook{Enter}')

    await waitFor(() => expect(router.state.location.search).toBe('?q=macbook'))
    await waitFor(() => expect(resultTitles()).toEqual(['MacBook Air M1, 2020', 'MacBook Air M1 · Space Grey']))
  })

  it('suggests matching items and picks one with the keyboard', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')
    const search = screen.getByRole('combobox', { name: 'Search items' })

    await user.type(search, 'mac')
    const list = await screen.findByRole('listbox', { name: 'Suggestions' })
    expect(
      within(list)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['MacBook Air M1, 2020', 'MacBook Air M1 · Space Grey'])

    await user.keyboard('{ArrowDown}')
    expect(search).toHaveAttribute('aria-activedescendant', within(list).getAllByRole('option')[0]!.id)
    await user.keyboard('{Enter}')

    await waitFor(() => expect(router.state.location.search).toBe('?q=MacBook+Air+M1%2C+2020'))
  })

  it('filters by trade mode with toggle chips', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')

    const swap = screen.getByRole('button', { name: 'Open to swap' })
    await user.click(swap)

    expect(swap).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(router.state.location.search).toBe('?mode=swap'))
    await waitFor(() => expect(resultTitles()).not.toContain('Tecno Camon CX'))
  })

  it('filters by one category at a time from the rail, and All clears it', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    const rail = await screen.findByRole('group', { name: 'Categories' })

    await user.click(await within(rail).findByRole('button', { name: 'Gaming' }))
    await waitFor(() => expect(router.state.location.search).toBe('?category=gaming'))
    await user.click(within(rail).getByRole('button', { name: 'Phones' }))

    await waitFor(() => expect(router.state.location.search).toBe('?category=phones'))
    expect(within(rail).getByRole('button', { name: 'Phones' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(rail).getByRole('button', { name: 'Gaming' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(within(rail).getByRole('button', { name: 'All' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows active filters as chips that remove one filter each', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore('/explore?q=mac&condition=good&min=1000')

    await user.click(await screen.findByRole('button', { name: 'Remove filter: Good' }))

    await waitFor(() => expect(router.state.location.search).toBe('?q=mac&min=1000'))
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('offers a way out when nothing matches', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore('/explore?q=zzzz')

    expect(await screen.findByRole('heading', { name: 'No items match your search' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows a retry when results fail to load', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${API}/listings`, () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 503 }), { once: true }),
    )
    renderExplore()

    expect(await screen.findByRole('heading', { name: "We couldn't load items" })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('14 items · newest first')).toBeInTheDocument()
  })

  it('ignores junk in a hand-edited link', async () => {
    renderExplore('/explore?min=abc&mode=teleport&category=boats')

    expect(await screen.findByText('14 items · newest first')).toBeInTheDocument()
  })

  it('keeps the filters when coming back from a listing', async () => {
    const { router } = renderExplore('/explore?mode=swap')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open to swap' })).toHaveAttribute('aria-pressed', 'true'),
    )

    await router.navigate('/listings/ps5-disc-edition')
    await router.navigate(-1)

    await waitFor(() => expect(router.state.location.search).toBe('?mode=swap'))
    expect(await screen.findByRole('button', { name: 'Open to swap' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Explore filter sheet', () => {
  it('uses checkboxes for areas that pick one at a time', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    expect(within(sheet).queryAllByRole('radio')).toHaveLength(0)
    const areas = within(sheet).getByRole('group', { name: 'Area' })
    const north = within(areas).getByRole('checkbox', { name: '[Pilot Area] North' })
    const east = within(areas).getByRole('checkbox', { name: '[Pilot Area] East' })

    await user.click(north)
    await user.click(east)
    expect(east).toBeChecked()
    expect(north).not.toBeChecked()
    await user.click(await within(sheet).findByRole('button', { name: /Show \d+ results/ }))

    await waitFor(() => expect(router.state.location.search).toBe('?area=east'))
    expect(useUiStore.getState().areaIds).toEqual(['east'])
  })

  it('uses checkboxes for categories that pick one at a time, and untick to clear', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    const categories = within(sheet).getByRole('group', { name: 'Category' })
    const phones = within(categories).getByRole('checkbox', { name: 'Phones' })
    const gaming = within(categories).getByRole('checkbox', { name: 'Gaming' })

    await user.click(phones)
    await user.click(gaming)
    expect(gaming).toBeChecked()
    expect(phones).not.toBeChecked()
    await user.click(gaming)
    expect(gaming).not.toBeChecked()
    await user.click(phones)
    await user.click(await within(sheet).findByRole('button', { name: /Show \d+ results/ }))

    await waitFor(() => expect(router.state.location.search).toBe('?category=phones'))
  })

  it('previews the result count and applies on "Show N results"', async () => {
    const user = userEvent.setup()
    const { router } = renderExplore()
    await screen.findByText('14 items · newest first')

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    await user.click(within(sheet).getByRole('checkbox', { name: 'Like new' }))

    const apply = await within(sheet).findByRole('button', { name: /Show 3 results/ })
    await user.click(apply)

    await waitFor(() => expect(router.state.location.search).toBe('?condition=like-new'))
  })

  it('flags a minimum price above the maximum and blocks Apply', async () => {
    const user = userEvent.setup()
    renderExplore()
    await screen.findByText('14 items · newest first')

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    await user.type(within(sheet).getByRole('textbox', { name: 'Minimum price' }), '500000')
    await user.type(within(sheet).getByRole('textbox', { name: 'Maximum price' }), '1000')

    expect(await within(sheet).findByText('The minimum is more than the maximum.')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Show/ })).toBeDisabled()
  })

  it('explains why price is off for swap-only searches', async () => {
    const user = userEvent.setup()
    renderExplore('/explore?mode=swap')
    await screen.findByText(/items · newest first/)

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })

    expect(within(sheet).getByRole('textbox', { name: 'Minimum price' })).toBeDisabled()
    expect(within(sheet).getByText('Swap-only listings have no asking price.')).toBeInTheDocument()
  })
})

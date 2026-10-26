import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { listings } from '@/mocks/fixtures/listings'
import { useSessionStore } from '@/stores/session'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

const renderDetail = (slug: string) => renderWithProviders(routes, { initialPath: `/listings/${slug}` })
const offerButton = () => screen.findByRole('button', { name: 'Make an offer' })

afterEach(() => useSessionStore.getState().clearSession())

describe('Listing detail', () => {
  it('shows the evidence in order, with defects before the offer button', async () => {
    renderDetail('iphone-12-pro-128gb')

    const title = await screen.findByRole('heading', { level: 1, name: 'iPhone 12 Pro · 128GB' })
    const defects = await screen.findByRole('heading', { name: 'Condition and defects' })
    const cta = await offerButton()

    expect(screen.getByText('₦385,000')).toBeInTheDocument()
    expect(screen.getByText('Small scratch on the left edge of the frame')).toBeInTheDocument()
    expect(screen.getByText('Phone confirmed')).toBeInTheDocument()
    expect(title.compareDocumentPosition(defects) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(defects.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Cash offers')).toBeInTheDocument()
    expect(screen.getByText('Open to swap')).toBeInTheDocument()
  })

  it('says plainly when the seller has disclosed no defects', async () => {
    renderDetail('ipad-9th-gen-64gb')

    expect(
      await screen.findByText('No defects disclosed by the seller. Inspect the item before you pay.'),
    ).toBeInTheDocument()
  })

  it('sets the listing title and share tags in the head', async () => {
    renderDetail('iphone-12-pro-128gb')
    await screen.findByRole('heading', { level: 1, name: 'iPhone 12 Pro · 128GB' })

    await waitFor(() => expect(document.title).toBe('iPhone 12 Pro · 128GB · [Pilot Area] Central · NextOwn'))
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/iphone-12-pro\.jpg$/)
  })

  it('has a gallery with a count, arrows, thumbnails and keyboard control', async () => {
    const user = userEvent.setup()
    renderDetail('iphone-12-pro-128gb')
    const gallery = await screen.findByRole('region', { name: 'Photos' })

    expect(within(gallery).getByText('1 of 3')).toBeInTheDocument()
    await user.click(within(gallery).getByRole('button', { name: 'Next photo' }))
    expect(within(gallery).getByText('2 of 3')).toBeInTheDocument()
    await user.click(within(gallery).getByRole('button', { name: 'Show photo 3 of 3' }))
    expect(within(gallery).getByText('3 of 3')).toBeInTheDocument()
    fireEvent.keyDown(within(within(gallery).getByRole('group', { name: /Photo 3 of 3/ })).getByRole('button'), {
      key: 'ArrowLeft',
    })
    expect(within(gallery).getByText('2 of 3')).toBeInTheDocument()
  })

  it('keeps content and actions working when photos fail to load', async () => {
    renderDetail('iphone-12-pro-128gb')
    const gallery = await screen.findByRole('region', { name: 'Photos' })

    for (const img of within(gallery).getAllByRole('img')) fireEvent.error(img)

    expect(within(gallery).getAllByText('Photo unavailable').length).toBeGreaterThan(0)
    expect(await offerButton()).toBeEnabled()
  })

  it('asks a guest to sign in before making an offer, and brings them back', async () => {
    const user = userEvent.setup()
    renderDetail('iphone-12-pro-128gb')

    await user.click(await offerButton())

    const prompt = await screen.findByRole('dialog', { name: 'Sign in to make an offer' })
    const next = encodeURIComponent('/offers/new?listing=l1')
    expect(within(prompt).getByRole('link', { name: 'Continue with your phone number' })).toHaveAttribute(
      'href',
      `/login?next=${next}`,
    )
  })

  it('asks a guest to sign in before saving', async () => {
    const user = userEvent.setup()
    renderDetail('iphone-12-pro-128gb')
    await offerButton()

    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]!)

    expect(await screen.findByRole('dialog', { name: 'Sign in to save items' })).toBeInTheDocument()
  })

  it('rechecks availability on tap and shows the real state if it changed', async () => {
    const user = userEvent.setup()
    renderDetail('iphone-12-pro-128gb')
    const cta = await offerButton()

    const iphone = listings.find((l) => l.slug === 'iphone-12-pro-128gb')!
    server.use(
      http.get(`${API}/listings/iphone-12-pro-128gb`, () => HttpResponse.json({ ...iphone, status: 'RESERVED' })),
    )
    await user.click(cta)

    expect(await screen.findByText('Reserved: this item is no longer accepting offers.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['xbox-series-x', 'Reserved: this item is no longer accepting offers.'],
    ['thinkpad-r51', 'Expired: this item is no longer accepting offers.'],
    ['ipad-32gb-older', 'Closed: this item is no longer accepting offers.'],
  ])('disables offers on %s with an honest message', async (slug, message) => {
    renderDetail(slug)

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make an offer' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not accepting offers' })).toBeDisabled()
  })

  it('shows a removed listing as unavailable, with no photos and noindex', async () => {
    renderDetail('removed-sample-listing')

    expect(await screen.findByRole('heading', { name: 'This listing is no longer available' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Photos' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow'),
    )
    expect(screen.getByRole('link', { name: 'Explore items' })).toHaveAttribute('href', '/explore')
  })

  it('shows Manage instead of Make an offer on your own listing', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderDetail('iphone-12-pro-128gb')

    expect(await screen.findByRole('link', { name: 'Manage listing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make an offer' })).not.toBeInTheDocument()
  })

  it('shows "Open to swap" instead of a price for swap-only listings', async () => {
    renderDetail('ps5-disc-edition')

    await screen.findByRole('heading', { level: 1, name: 'PS5 Disc Edition' })
    expect(screen.queryByText(/₦/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Open to swap').length).toBeGreaterThan(0)
    expect(screen.getByText('A laptop for office work (i5 or M1, 8GB RAM or more)')).toBeInTheDocument()
  })

  it('never shows a phone number or address', async () => {
    const { container } = renderDetail('iphone-12-pro-128gb')
    await offerButton()

    expect(container.textContent).not.toMatch(/\+234|\b0[789][01]\d{8}\b|street|address/i)
    expect(screen.getAllByText('[Pilot Area] Central', { selector: 'span' }).length).toBeGreaterThan(0)
  })

  it('has a back button that returns to the exact page the visitor came from', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(routes, { initialPath: '/explore?mode=swap' })
    await screen.findByRole('heading', { level: 1, name: 'Explore items' })

    await router.navigate('/listings/ps5-disc-edition')
    await user.click(await screen.findByRole('button', { name: 'Back' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/explore'))
    expect(router.state.location.search).toBe('?mode=swap')
  })

  it('offers a way into Explore when the visitor landed straight on the listing', async () => {
    renderDetail('iphone-12-pro-128gb')
    await screen.findByRole('heading', { level: 1, name: 'iPhone 12 Pro · 128GB' })

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore more items' })).toHaveAttribute('href', '/explore')
  })

  it('shows a not-found page for an unknown listing', async () => {
    renderDetail('does-not-exist')

    expect(await screen.findByRole('heading', { name: "We couldn't find that listing" })).toBeInTheDocument()
  })

  it('shows a retry when the listing fails to load', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(
        `${API}/listings/iphone-12-pro-128gb`,
        () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 503 }),
        { once: true },
      ),
    )
    renderDetail('iphone-12-pro-128gb')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'iPhone 12 Pro · 128GB' })).toBeInTheDocument()
  })
})

describe('Saving a listing (FE-SAV-01)', () => {
  const saveButtons = () => screen.findAllByRole('button', { name: /^Saved?$/ })

  it('saves at once, and the item appears in Saved', async () => {
    const user = userEvent.setup()
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    const { router } = renderDetail('macbook-air-m1-2020-gold')
    await offerButton()

    await user.click((await saveButtons())[0]!)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Saved' })[0]).toHaveAttribute('aria-pressed', 'true'),
    )

    await router.navigate('/saved')
    expect(await screen.findByRole('link', { name: /MacBook Air M1, 2020/ })).toBeInTheDocument()
  })

  it('puts the toggle back and says so when saving fails', async () => {
    const user = userEvent.setup()
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    server.use(http.put(`${API}/saved/listing/:id`, () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 503 })))
    renderDetail('macbook-air-m1-2020-gold')
    await offerButton()

    await user.click((await saveButtons())[0]!)

    expect(await screen.findByText('We couldn’t save that. Try again.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Save' })[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('finishes a guest’s save after sign-in, and never unsaves (QA-01)', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    // Already saved before: coming back with the intent must leave it saved
    renderWithProviders(routes, { initialPath: '/listings/nintendo-switch-docked?intent=save' })

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Saved' })[0]).toHaveAttribute('aria-pressed', 'true'),
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getAllByRole('button', { name: 'Saved' })[0]).toHaveAttribute('aria-pressed', 'true')
  })
})

import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { listingQueryOptions, useListings } from '@/features/listings/api'
import { ListingRow, ListingTile } from '@/features/listings/components/ListingCards'
import { defaultFilters } from '@/features/listings/filters'
import { listings } from '@/mocks/fixtures/listings'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import type { ListingSummary } from '@/types/api'

const API = import.meta.env.VITE_API_BASE_URL

const listing: ListingSummary = {
  id: 'l1',
  slug: 'iphone-12-pro-128gb',
  title: 'iPhone 12 Pro · 128GB',
  categoryId: 'phones',
  condition: 'GOOD',
  defectSummary: 'Small scratch on frame',
  acceptedModes: ['CASH', 'SWAP'],
  askingKobo: 38_500_000,
  areaName: '[Pilot Area]',
  status: 'ACTIVE',
  publishedAt: '2026-10-20T10:00:00Z',
  cover: { url: '/mock/items/iphone.jpg', alt: 'iPhone 12 Pro, back view', width: 800, height: 600 },
  sample: true,
}

const renderCard = (element: React.ReactNode) => renderWithProviders([{ path: '/', element }])

describe.each([
  ['ListingRow', ListingRow],
  ['ListingTile', ListingTile],
])('%s', (_name, Card) => {
  it('shows price, condition and links to the listing', async () => {
    renderCard(<Card listing={listing} />)

    const link = await screen.findByRole('link', { name: /iPhone 12 Pro/ })
    expect(link).toHaveAttribute('href', '/listings/iphone-12-pro-128gb')
    expect(within(link).getByText('₦385,000')).toBeInTheDocument()
    expect(within(link).getByText(/Good/)).toBeInTheDocument()
  })

  it.each([
    ['RESERVED', 'Reserved'],
    ['EXPIRED', 'Expired'],
    ['CLOSED', 'Closed'],
    ['REMOVED', 'No longer available'],
  ] as const)('makes a %s listing unmistakable, with its label and no price', async (status, label) => {
    renderCard(<Card listing={{ ...listing, status }} />)

    const link = await screen.findByRole('link')
    expect(within(link).getByText(label)).toBeInTheDocument()
    expect(within(link).queryByText('₦385,000')).not.toBeInTheDocument()
  })

  it('labels a swap-only listing instead of showing a price', async () => {
    renderCard(<Card listing={{ ...listing, askingKobo: null, acceptedModes: ['SWAP'] }} />)

    expect(await screen.findByText('Open to swap')).toBeInTheDocument()
  })

  it('shows the real Quick Sell time left', async () => {
    const endsAt = new Date(Date.now() + 5 * 3_600_000 + 60_000).toISOString()
    renderCard(<Card listing={{ ...listing, urgencyEndsAt: endsAt }} />)

    expect(await screen.findByText(/5h/)).toBeInTheDocument()
  })
})

function Results() {
  const { data } = useListings(defaultFilters)
  return (
    <ul>
      {data?.pages
        .flatMap((p) => p.items)
        .map((l) => (
          <li key={l.id}>
            <ListingRow listing={l} />
          </li>
        ))}
    </ul>
  )
}

describe('stale cards (FE-EXP-05)', () => {
  it('shows the true state when a listing turns out to be reserved after the results loaded', async () => {
    const { queryClient } = renderWithProviders([{ path: '/', element: <Results /> }])
    const card = await screen.findByRole('link', { name: /iPhone 12 Pro · 128GB/ })
    expect(within(card).getByText('₦385,000')).toBeInTheDocument()

    const iphone = listings.find((l) => l.slug === 'iphone-12-pro-128gb')!
    server.use(http.get(`${API}/listings/iphone-12-pro-128gb`, () => HttpResponse.json({ ...iphone, status: 'RESERVED' })))
    await queryClient.fetchQuery(listingQueryOptions(queryClient, 'iphone-12-pro-128gb'))

    expect(await within(card).findByText('Reserved')).toBeInTheDocument()
    expect(within(card).queryByText('₦385,000')).not.toBeInTheDocument()
  })
})

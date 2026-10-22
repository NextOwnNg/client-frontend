import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ListingRow } from '@/components/domain/ListingRow'
import { OfferSum } from '@/components/domain/OfferSum'
import type { ListingSummary } from '@/types/api'

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

describe('OfferSum', () => {
  it('writes the trade out as a sum with the payer sentence as its answer', () => {
    render(
      <OfferSum
        give={[
          { kind: 'item', title: 'PS5 Disc Edition' },
          { kind: 'cash', title: 'Cash you add', kobo: 12_000_000 },
        ]}
        receive={{ title: 'MacBook Air M1, 2020' }}
        sentence="You pay ₦120,000 directly at the exchange."
        delta={{ kobo: 5_000_000, label: 'more than their last offer' }}
      />,
    )

    expect(screen.getByText('PS5 Disc Edition')).toBeInTheDocument()
    expect(screen.getByText('₦120,000')).toBeInTheDocument()
    expect(screen.getByText('MacBook Air M1, 2020')).toBeInTheDocument()
    expect(screen.getByText('You pay ₦120,000 directly at the exchange.')).toBeInTheDocument()
    expect(screen.getByText('+₦50,000')).toBeInTheDocument()
  })
})

describe('ListingRow', () => {
  it('shows price, condition and area for an available listing', () => {
    render(<ListingRow listing={listing} />, { wrapper: MemoryRouter })

    const link = screen.getByRole('link', { name: /iPhone 12 Pro/ })
    expect(link).toHaveAttribute('href', '/listings/iphone-12-pro-128gb')
    expect(screen.getByText('₦385,000')).toBeInTheDocument()
    expect(screen.getByText(/Good/)).toBeInTheDocument()
  })

  it('makes a reserved listing unmistakable', () => {
    render(<ListingRow listing={{ ...listing, status: 'RESERVED' }} />, { wrapper: MemoryRouter })

    expect(screen.getByText('Reserved')).toBeInTheDocument()
  })

  it('labels a swap-only listing instead of showing a price', () => {
    render(<ListingRow listing={{ ...listing, askingKobo: null, acceptedModes: ['SWAP'] }} />, { wrapper: MemoryRouter })

    expect(screen.getByText('Open to swap')).toBeInTheDocument()
  })
})

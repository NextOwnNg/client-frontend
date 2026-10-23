import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OfferSum } from '@/components/domain/OfferSum'

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

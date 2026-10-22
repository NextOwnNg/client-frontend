import { describe, expect, it } from 'vitest'
import { payerSentence } from '@/components/domain/payer-sentence'

describe('payerSentence', () => {
  it('tells the offerer when they pay', () => {
    expect(payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: 12_000_000 })).toBe(
      'You pay ₦120,000 directly at the exchange.',
    )
  })

  it('tells the owner when they receive', () => {
    expect(payerSentence({ viewer: 'owner', direction: 'OFFERER_PAYS_OWNER', kobo: 12_000_000 })).toBe(
      'The other person pays you ₦120,000 directly at the exchange.',
    )
  })

  it('tells the offerer when they receive', () => {
    expect(payerSentence({ viewer: 'offerer', direction: 'OWNER_PAYS_OFFERER', kobo: 5_000_000 })).toBe(
      'The other person pays you ₦50,000 directly at the exchange.',
    )
  })

  it('tells the owner when they pay', () => {
    expect(payerSentence({ viewer: 'owner', direction: 'OWNER_PAYS_OFFERER', kobo: 5_000_000 })).toBe(
      'You pay ₦50,000 directly at the exchange.',
    )
  })

  it('says plainly when no cash changes hands', () => {
    expect(payerSentence({ viewer: 'offerer', direction: 'NONE', kobo: 0 })).toBe('No cash changes hands.')
    expect(payerSentence({ viewer: 'owner', direction: 'NONE', kobo: 0 })).toBe('No cash changes hands.')
  })
})

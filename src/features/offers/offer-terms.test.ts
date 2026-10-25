import { describe, expect, it } from 'vitest'
import {
  allowedModes,
  diffVersions,
  offerSum,
  offerTab,
  toPayload,
  tradeSentence,
  validateTerms,
  type TradeParts,
} from '@/features/offers/offer-terms'
import { offerStatus } from '@/lib/copy/offer-status'
import type { Offer, OfferTerms, OfferVersion } from '@/types/api'

const terms = (overrides: Partial<OfferTerms> = {}): OfferTerms => ({
  mode: 'SWAP_PLUS_CASH',
  offeredItemId: 'i-laptop',
  cashKobo: 5_000_000,
  cashDirection: 'OWNER_PAYS_OFFERER',
  note: '',
  ...overrides,
})

const parts = (overrides: Partial<OfferTerms> = {}): TradeParts => ({
  terms: terms(overrides),
  listingTitle: 'MacBook',
  itemTitle: 'laptop',
})

describe('trade sentences (QA-03)', () => {
  it('writes swap + cash where the offerer receives cash, for both people', () => {
    expect(tradeSentence(parts(), 'offerer')).toBe(
      'You offer your laptop. They give you the MacBook and pay you ₦50,000.',
    )
    expect(tradeSentence(parts(), 'owner')).toBe(
      'They offer their laptop. You give them your MacBook and pay them ₦50,000.',
    )
  })

  it('writes swap + cash where the offerer adds cash (UX-17 example)', () => {
    const p = { ...parts({ cashKobo: 30_000_000, cashDirection: 'OFFERER_PAYS_OWNER' }), itemTitle: 'PS5' }
    expect(tradeSentence(p, 'offerer')).toBe('You offer your PS5 and pay ₦300,000. They give you the MacBook.')
    expect(tradeSentence(p, 'owner')).toBe('They offer their PS5 and pay you ₦300,000. You give them your MacBook.')
  })

  it('writes a plain swap and a cash offer', () => {
    const swap = parts({ mode: 'SWAP', cashKobo: 0, cashDirection: 'NONE' })
    expect(tradeSentence(swap, 'offerer')).toBe('You offer your laptop. They give you the MacBook.')
    expect(tradeSentence(swap, 'owner')).toBe('They offer their laptop. You give them your MacBook.')

    const cash = {
      ...parts({ mode: 'CASH', offeredItemId: null, cashDirection: 'OFFERER_PAYS_OWNER' }),
      itemTitle: null,
    }
    expect(tradeSentence(cash, 'offerer')).toBe('You would pay ₦50,000 to receive the MacBook.')
    expect(tradeSentence(cash, 'owner')).toBe('They would pay you ₦50,000 for your MacBook.')
  })
})

describe('the worked-out sum', () => {
  it('puts each person’s items and cash on the right side', () => {
    const offerer = offerSum(parts(), 'offerer')
    expect(offerer.give).toEqual([{ kind: 'item', title: 'laptop' }])
    expect(offerer.receive).toEqual({ title: 'MacBook', kobo: 5_000_000 })
    expect(offerer.sentence).toBe('The other person pays you ₦50,000 directly at the exchange.')

    const owner = offerSum(parts(), 'owner')
    expect(owner.give).toEqual([
      { kind: 'item', title: 'MacBook' },
      { kind: 'cash', title: 'Cash', kobo: 5_000_000 },
    ])
    expect(owner.receive).toEqual({ title: 'laptop', kobo: undefined })
    expect(owner.sentence).toBe('You pay ₦50,000 directly at the exchange.')
  })
})

describe('validation', () => {
  it('suggests Swap when a swap + cash amount is ₦0, and needs a direction', () => {
    expect(validateTerms(terms({ cashKobo: 0 }), ['SWAP']).cashKobo).toBe(
      'Enter an amount above ₦0, or switch to Swap.',
    )
    expect(validateTerms(terms({ cashDirection: 'NONE' }), ['SWAP']).cashDirection).toBe('Choose who adds the cash.')
  })

  it('accepts complete terms and refuses a mode the listing doesn’t take', () => {
    expect(validateTerms(terms(), ['CASH', 'SWAP'])).toEqual({})
    expect(validateTerms(terms(), ['CASH']).mode).toBeDefined()
  })

  it('offers only the modes a listing accepts, with reasons', () => {
    expect(allowedModes(['CASH']).map((m) => m.allowed)).toEqual([true, false, false])
    expect(allowedModes(['SWAP'])[0]!.reason).toBe('The owner only wants to swap this item.')
  })

  it('normalises the payload for each mode (PRD §7.1)', () => {
    expect(toPayload(terms({ mode: 'CASH', cashDirection: 'NONE', note: '  hi ' }))).toMatchObject({
      offeredItemId: null,
      cashDirection: 'OFFERER_PAYS_OWNER',
      note: 'hi',
    })
    expect(toPayload(terms({ mode: 'SWAP' }))).toMatchObject({ cashKobo: 0, cashDirection: 'NONE' })
    expect(toPayload(terms())).toMatchObject({ cashKobo: 5_000_000, cashDirection: 'OWNER_PAYS_OFFERER' })
  })
})

describe('comparing versions (FE-OFF-12)', () => {
  it('describes amount changes from the reader’s side', () => {
    const before = terms({
      mode: 'CASH',
      offeredItemId: null,
      cashKobo: 17_000_000,
      cashDirection: 'OFFERER_PAYS_OWNER',
    })
    const after = { ...before, cashKobo: 19_500_000 }

    expect(diffVersions(before, after, 'offerer')).toEqual([
      { field: 'cash', label: 'Cash', before: '₦170,000', after: '₦195,000', note: 'You would pay ₦25,000 more.' },
    ])
    expect(diffVersions(before, after, 'owner')[0]!.note).toBe('You would receive ₦25,000 more.')
  })

  it('spells out a change of payer and of kind', () => {
    const before = terms({ mode: 'SWAP', cashKobo: 0, cashDirection: 'NONE' })
    const after = terms({ cashKobo: 2_000_000, cashDirection: 'OFFERER_PAYS_OWNER' })

    expect(diffVersions(before, after, 'offerer')).toEqual([
      { field: 'mode', label: 'Kind of offer', before: 'Swap', after: 'Swap + cash' },
      { field: 'payer', label: 'Who pays', before: 'No cash', after: 'You pay' },
      { field: 'cash', label: 'Cash', before: '₦0', after: '₦20,000' },
    ])
  })

  it('reports nothing when only the note changed', () => {
    expect(diffVersions(terms(), terms({ note: 'Please' }), 'owner')).toEqual([])
  })
})

describe('offer status and tabs', () => {
  const version = (authorId: string, number = 1) => ({ ...terms(), id: `v${number}`, number, authorId }) as OfferVersion
  const offer = (fields: Partial<Offer>) =>
    ({ status: 'PENDING', viewerRole: 'owner', turnUserId: 'me', versions: [version('them')], ...fields }) as Offer

  it('labels whose move it is (PRD §7.6)', () => {
    expect(offerStatus(offer({}), 'me').label).toBe('Offer received')
    expect(offerStatus(offer({ versions: [version('them'), version('me', 2), version('them', 3)] }), 'me').label).toBe(
      'Counteroffer received',
    )
    expect(offerStatus(offer({ turnUserId: 'them', versions: [version('me')] }), 'me').label).toBe('Offer sent')
    expect(offerStatus(offer({ turnUserId: 'them', versions: [version('them'), version('me', 2)] }), 'me').label).toBe(
      'Counteroffer sent',
    )
  })

  it('labels closed offers', () => {
    const labels = (['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'CLOSED_UNAVAILABLE'] as const).map(
      (status) => offerStatus(offer({ status, turnUserId: null }), 'me').label,
    )
    expect(labels).toEqual(['Accepted', 'Declined', 'Withdrawn', 'Expired', 'No longer available'])
  })

  it('sorts offers into inbox tabs', () => {
    expect(offerTab(offer({}))).toBe('received')
    expect(offerTab(offer({ viewerRole: 'offerer' }))).toBe('sent')
    expect(offerTab(offer({ status: 'ACCEPTED' }))).toBe('handover')
    expect(offerTab(offer({ status: 'EXPIRED' }))).toBe('closed')
  })
})

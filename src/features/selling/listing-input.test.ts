import { describe, expect, it } from 'vitest'
import {
  detailToInput,
  emptyListingInput,
  firstInvalidStep,
  inputToDetail,
  stepOfField,
  validateListing,
  validateStep,
} from '@/features/selling/listing-input'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { listings, sellers } from '@/mocks/fixtures/listings'
import type { ListingInput } from '@/types/api'

const photo = { id: 'm-1', url: '/a.jpg', alt: 'Front of the phone', width: 1600, height: 1200 }

const complete: ListingInput = {
  ...emptyListingInput,
  title: 'iPhone 12 · 128GB',
  categoryId: 'phones',
  categoryFields: { storage: '128GB', battery: 'unknown' },
  photos: [photo],
  condition: 'GOOD',
  defects: ['Small scratch on the back'],
  repairs: 'None',
  accessories: 'Original box',
  ownershipConfirmed: true,
  modes: ['CASH', 'SWAP'],
  askingKobo: 30_000_000,
  desiredSwap: 'A laptop',
  areaId: 'north',
}

describe('listing validation', () => {
  it('accepts a complete listing', () => {
    expect(validateListing(complete, runtimeConfig)).toEqual({})
  })

  it('names every missing required field of an empty draft', () => {
    const errors = validateListing(emptyListingInput, runtimeConfig)

    expect(Object.keys(errors).sort()).toEqual(
      [
        'accessories',
        'areaId',
        'categoryId',
        'condition',
        'defects',
        'modes',
        'ownershipConfirmed',
        'photos',
        'repairs',
        'title',
      ].sort(),
    )
  })

  it('asks for a defect list or an explicit "no defects"', () => {
    expect(validateListing({ ...complete, defects: [] }, runtimeConfig).defects).toBeTruthy()
    expect(validateListing({ ...complete, defects: [], noDefects: true }, runtimeConfig).defects).toBeUndefined()
  })

  it('needs a price above ₦0 when cash is accepted', () => {
    expect(validateListing({ ...complete, askingKobo: 0 }, runtimeConfig).askingKobo).toBe(
      'Enter an asking price above ₦0.',
    )
    expect(
      validateListing({ ...complete, modes: ['SWAP'], askingKobo: null }, runtimeConfig).askingKobo,
    ).toBeUndefined()
  })

  it('needs a swap wish or "Open to offers" when swaps are accepted', () => {
    const swap = { ...complete, modes: ['SWAP' as const], desiredSwap: '' }
    expect(validateListing(swap, runtimeConfig).desiredSwap).toBeTruthy()
    expect(validateListing({ ...swap, openToOffers: true }, runtimeConfig).desiredSwap).toBeUndefined()
  })

  it('needs a deadline when Quick Sell is on, from the configured options', () => {
    expect(validateListing({ ...complete, quickSell: true }, runtimeConfig).quickSellHours).toBeTruthy()
    expect(
      validateListing({ ...complete, quickSell: true, quickSellHours: 5 }, runtimeConfig).quickSellHours,
    ).toBeTruthy()
    expect(
      validateListing({ ...complete, quickSell: true, quickSellHours: 48 }, runtimeConfig).quickSellHours,
    ).toBeUndefined()
  })

  it('needs category fields that allow "Not known" to be answered', () => {
    const errors = validateListing({ ...complete, categoryFields: {} }, runtimeConfig)
    expect(errors['categoryFields.storage']).toBeTruthy()
    expect(errors['categoryFields.accessories']).toBeUndefined()
  })

  it('checks battery health as a percentage', () => {
    const errors = validateListing({ ...complete, categoryFields: { storage: '128GB', battery: '140' } }, runtimeConfig)
    expect(errors['categoryFields.battery']).toBe('Enter a percentage from 1 to 100, or choose Not known.')
  })

  it('validates one step at a time and finds the first step with a problem', () => {
    const partial = { ...complete, condition: null }
    expect(validateStep('basics', partial, runtimeConfig)).toEqual({})
    expect(validateStep('condition', partial, runtimeConfig).condition).toBeTruthy()
    expect(firstInvalidStep(partial, runtimeConfig)).toBe('condition')
    expect(stepOfField('categoryFields.storage')).toBe('basics')
    expect(stepOfField('quickSellHours')).toBe('trade')
  })
})

describe('preview mapping', () => {
  it('turns the wizard input into the public listing shape', () => {
    const detail = inputToDetail(complete, {
      id: 'l-new',
      slug: 'l-new',
      status: 'ACTIVE',
      publishedAt: '2026-10-25T09:00:00.000Z',
      seller: sellers[0]!,
      config: runtimeConfig,
    })

    expect(detail).toMatchObject({
      title: 'iPhone 12 · 128GB',
      acceptedModes: ['CASH', 'SWAP'],
      askingKobo: 30_000_000,
      areaName: '[Pilot Area] North',
      cover: { url: '/a.jpg' },
      defectSummary: 'Small scratch on the back',
      desiredSwap: 'A laptop',
    })
    expect(detail.categoryFields).toEqual([
      { label: 'Storage', value: '128GB' },
      { label: 'Battery health', value: 'Not known' },
    ])
  })

  it('drops the price of a swap-only listing and shows "Open to offers"', () => {
    const detail = inputToDetail(
      { ...complete, modes: ['SWAP'], openToOffers: true, desiredSwap: '' },
      { id: 'x', slug: 'x', status: 'ACTIVE', publishedAt: '', seller: sellers[0]!, config: runtimeConfig },
    )
    expect(detail.askingKobo).toBeNull()
    expect(detail.desiredSwap).toBe('Open to offers')
  })

  it('round-trips a published listing back into the wizard', () => {
    const source = listings.find((l) => l.slug === 'iphone-12-pro-128gb')!
    const input = detailToInput(source, runtimeConfig)

    expect(input).toMatchObject({
      title: source.title,
      categoryId: 'phones',
      condition: source.condition,
      ownershipConfirmed: true,
      areaId: 'central',
    })
    expect(input.photos.map((p) => p.url)).toEqual(source.images.map((i) => i.url))
    expect(input.categoryFields.storage).toBe('128GB')
  })
})

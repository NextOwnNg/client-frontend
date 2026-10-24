import { describe, expect, it } from 'vitest'
import { runtimeConfig } from '@/mocks/fixtures/config'
import {
  activeChips,
  canonicalSearch,
  countPanelFilters,
  defaultFilters,
  parseFilters,
  priceDisabled,
  serializeFilters,
  toApiParams,
  validatePrice,
} from '@/features/listings/filters'

const parse = (query: string) => parseFilters(new URLSearchParams(query), runtimeConfig)

describe('listing filters in the URL', () => {
  it('round-trips every filter through the query string', () => {
    const filters = {
      q: 'iphone',
      categories: ['phones'],
      areas: ['central'],
      modes: ['CASH', 'QUICK_SELL'] as const,
      priceMin: 100_000,
      priceMax: 400_000,
      conditions: ['GOOD', 'LIKE_NEW'] as const,
      sort: 'recent' as const,
    }
    const query = serializeFilters({
      ...filters,
      categories: [...filters.categories],
      modes: [...filters.modes],
      conditions: [...filters.conditions],
    }).toString()

    expect(query).toBe(
      'q=iphone&category=phones&area=central&mode=cash%2Cquick-sell&min=100000&max=400000&condition=good%2Clike-new',
    )
    expect(parse(query).filters).toEqual({
      ...filters,
      modes: ['CASH', 'QUICK_SELL'],
      conditions: ['GOOD', 'LIKE_NEW'],
    })
  })

  it('serialises the defaults as an empty query', () => {
    expect(serializeFilters(defaultFilters).toString()).toBe('')
    expect(parse('').filters).toEqual(defaultFilters)
  })

  it('drops junk values from a hand-edited link instead of failing', () => {
    const { filters } = parse('min=abc&max=-5&mode=teleport,swap&condition=mint,fair&sort=cheapest&q=%20%20')

    expect(filters.priceMin).toBeUndefined()
    expect(filters.priceMax).toBeUndefined()
    expect(filters.modes).toEqual(['SWAP'])
    expect(filters.conditions).toEqual(['FAIR'])
    expect(filters.sort).toBe('recent')
    expect(filters.q).toBeUndefined()
  })

  it('keeps one category and one area, the first valid one, from a link that lists several', () => {
    expect(parse('category=gaming,phones&area=north,east').filters).toMatchObject({
      categories: ['gaming'],
      areas: ['north'],
    })
  })

  it('drops an unknown category or area once the pilot config is known', () => {
    expect(parse('category=boats,gaming,gaming&area=mars,east').filters).toMatchObject({
      categories: ['gaming'],
      areas: ['east'],
    })
    // Before config loads, values are kept so a shared link isn't lost
    expect(parseFilters(new URLSearchParams('category=boats')).filters.categories).toEqual(['boats'])
  })

  it('rounds prices to whole naira', () => {
    expect(parse('min=1500.7').filters.priceMin).toBe(1501)
  })
})

describe('price rules', () => {
  it('flags a minimum above the maximum and keeps it out of the API request', () => {
    const { filters, issues } = parse('min=500000&max=100000')

    expect(issues).toEqual(['min_gt_max'])
    expect(validatePrice(filters.priceMin, filters.priceMax)).toBe('min_gt_max')
    expect(toApiParams(filters)).not.toHaveProperty('price_min')
    expect(toApiParams(filters)).not.toHaveProperty('price_max')
  })

  it('disables price for swap-only searches, where listings have no asking price', () => {
    const { filters } = parse('mode=swap&min=1000')

    expect(priceDisabled(filters)).toBe(true)
    expect(toApiParams(filters)).not.toHaveProperty('price_min')
    expect(priceDisabled(parse('mode=swap,cash').filters)).toBe(false)
  })

  it('sends prices in naira with comma-joined lists', () => {
    expect(toApiParams(parse('mode=cash,swap&condition=good&min=1000&max=2000').filters)).toEqual({
      mode: 'CASH,SWAP',
      condition: 'GOOD',
      price_min: 1000,
      price_max: 2000,
      sort: 'recent',
    })
  })
})

describe('active filter chips', () => {
  it('labels each filter in plain words and removes only that filter', () => {
    const { filters } = parse('q=mac&category=laptops&area=north&mode=swap&min=1000&max=250000&condition=like-new')
    const chips = activeChips(filters, runtimeConfig)

    expect(chips.map((c) => c.label)).toEqual([
      '“mac”',
      'Laptops & tablets',
      '[Pilot Area] North',
      'Open to swap',
      '₦1,000 – ₦250,000',
      'Like new',
    ])
    const withoutSwap = chips.find((c) => c.label === 'Open to swap')!.remove()
    expect(withoutSwap.modes).toEqual([])
    expect(withoutSwap.categories).toEqual(['laptops'])
    expect(chips.find((c) => c.label === 'Laptops & tablets')!.remove().categories).toEqual([])
  })

  it('describes an open-ended price range', () => {
    expect(activeChips(parse('min=5000').filters, runtimeConfig).map((c) => c.label)).toEqual(['From ₦5,000'])
    expect(activeChips(parse('max=5000').filters, runtimeConfig).map((c) => c.label)).toEqual(['Up to ₦5,000'])
  })

  it('counts the filters that live in the filter panel, not the search text', () => {
    expect(countPanelFilters(parse('q=mac&category=laptops&mode=swap,cash&min=1').filters)).toBe(4)
  })
})

describe('canonical URL', () => {
  it('keeps only the meaningful filters: category and area', () => {
    expect(canonicalSearch(parse('q=mac&category=laptops&area=north&mode=swap').filters)).toBe(
      '?category=laptops&area=north',
    )
    expect(canonicalSearch(parse('q=mac').filters)).toBe('')
  })
})

import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import { categories, runtimeConfig } from '@/mocks/fixtures/config'
import { listings } from '@/mocks/fixtures/listings'
import { useDevSettings } from '@/mocks/dev-settings'
import type { ItemCondition, ListingDetail, ListingSuggestion, ListingSummary, Paginated } from '@/types/api'

const API = import.meta.env.VITE_API_BASE_URL
const PAGE_SIZE = 12

/** Simulated network: latency and a one-shot failure from the dev toolbar (no-ops in tests). */
async function network() {
  const { latencyMs, failNext, setFailNext } = useDevSettings.getState()
  if (import.meta.env.MODE !== 'test') await delay(latencyMs)
  if (failNext) {
    setFailNext(false)
    return HttpResponse.json({ code: 'SERVER_ERROR', message: 'Simulated failure' }, { status: 503 })
  }
  return null
}

const toSummary = ({
  images: _images,
  description: _description,
  defects: _defects,
  repairs: _repairs,
  accessories: _accessories,
  desiredSwap: _desiredSwap,
  categoryFields: _categoryFields,
  seller: _seller,
  ...summary
}: ListingDetail): ListingSummary => summary

/** Removed listings keep only what the page needs to say so (PRD FE-SEO-03: nothing indexable). */
function toPublicDetail(listing: ListingDetail): ListingDetail {
  if (listing.status !== 'REMOVED') return listing
  return {
    ...listing,
    title: 'Listing removed',
    defectSummary: undefined,
    askingKobo: null,
    images: [],
    description: '',
    defects: [],
    repairs: undefined,
    accessories: undefined,
    desiredSwap: undefined,
    categoryFields: [],
    seller: { id: '', displayName: '', phoneConfirmed: false, reviewCount: 0, areaName: listing.areaName },
  }
}

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : [])
const nairaParam = (value: string | null) => {
  const n = value === null ? NaN : Number(value)
  return Number.isFinite(n) && n >= 0 ? n * 100 : null
}

export const handlers: RequestHandler[] = [
  http.get(`${API}/config`, async () => (await network()) ?? HttpResponse.json(runtimeConfig)),

  http.get(`${API}/listings/suggest`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const q = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
    if (q.length < 2) return HttpResponse.json<ListingSuggestion[]>([])

    const titles = [...new Set(listings.filter((l) => l.status === 'ACTIVE' && l.title.toLowerCase().includes(q)).map((l) => l.title))]
    const suggestions: ListingSuggestion[] = [
      ...categories
        .filter((c) => c.name.toLowerCase().includes(q))
        .map((c) => ({ kind: 'category' as const, label: c.name, categoryId: c.id })),
      ...titles.map((label) => ({ kind: 'query' as const, label })),
    ]
    return HttpResponse.json(suggestions.slice(0, 6))
  }),

  http.get(`${API}/listings`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim().toLowerCase()
    const category = params.get('category')
    const area = params.get('area')
    const modes = list(params.get('mode'))
    const conditions = list(params.get('condition')) as ItemCondition[]
    const urgent = params.get('urgent') === 'true'
    const min = nairaParam(params.get('price_min'))
    const max = nairaParam(params.get('price_max'))
    const cursor = Number(params.get('cursor') ?? 0)

    const matches = listings
      // Public results only show listings that can take offers (PRD DSC-02).
      .filter((l) => l.status === 'ACTIVE')
      .filter((l) => !q || l.title.toLowerCase().includes(q))
      .filter((l) => !category || l.categoryId === category)
      .filter((l) => !area || runtimeConfig.areas.find((a) => a.id === area)?.name === l.areaName)
      // Modes widen each other: "For sale" or "Open to swap" or "Quick Sell"
      .filter(
        (l) =>
          modes.length === 0 ||
          modes.some((m) => (m === 'QUICK_SELL' ? Boolean(l.urgencyEndsAt) : l.acceptedModes.includes(m as 'CASH' | 'SWAP'))),
      )
      .filter((l) => !urgent || Boolean(l.urgencyEndsAt))
      .filter((l) => conditions.length === 0 || conditions.includes(l.condition))
      .filter((l) => (min === null && max === null) || l.askingKobo !== null)
      .filter((l) => min === null || l.askingKobo! >= min)
      .filter((l) => max === null || l.askingKobo! <= max)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))

    const page = matches.slice(cursor, cursor + PAGE_SIZE).map(toSummary)
    const nextCursor = cursor + PAGE_SIZE < matches.length ? String(cursor + PAGE_SIZE) : null
    return HttpResponse.json<Paginated<ListingSummary>>({ items: page, nextCursor, total: matches.length })
  }),

  http.get(`${API}/listings/:slug`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure

    const listing = listings.find((l) => l.slug === params.slug || l.id === params.slug)
    if (!listing) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Listing not found' }, { status: 404 })
    return HttpResponse.json(toPublicDetail(listing))
  }),
]

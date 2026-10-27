import { http, HttpResponse, type RequestHandler } from 'msw'
import { categories, runtimeConfig } from '@/mocks/fixtures/config'
import { apiBaseUrl } from '@/lib/env'
import { authDb } from '@/mocks/db/auth'
import { listingsDb, toSummary } from '@/mocks/db/listings'
import { authHandlers } from '@/mocks/handlers/auth'
import { communityHandlers } from '@/mocks/handlers/community'
import { network } from '@/mocks/handlers/network'
import { offersHandlers } from '@/mocks/handlers/offers'
import { transactionsHandlers } from '@/mocks/handlers/transactions'
import { sellingHandlers } from '@/mocks/handlers/selling'
import type {
  ItemCondition,
  ListingDetail,
  ListingSuggestion,
  ListingSummary,
  Paginated,
  PublicProfile,
} from '@/types/api'

const API = apiBaseUrl
const PAGE_SIZE = 12

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

const notFound = (message: string) => HttpResponse.json({ code: 'NOT_FOUND', message }, { status: 404 })

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...sellingHandlers,
  ...offersHandlers,
  ...transactionsHandlers,
  ...communityHandlers,

  http.get(`${API}/config`, async () => (await network()) ?? HttpResponse.json(runtimeConfig)),

  http.get(`${API}/listings/suggest`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const q = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
    if (q.length < 2) return HttpResponse.json<ListingSuggestion[]>([])

    const titles = [
      ...new Set(
        listingsDb
          .details()
          .filter((l) => l.status === 'ACTIVE' && l.title.toLowerCase().includes(q))
          .map((l) => l.title),
      ),
    ]
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
    const categoryIds = list(params.get('category'))
    const areaNames = list(params.get('area')).map((id) => runtimeConfig.areas.find((a) => a.id === id)?.name)
    const modes = list(params.get('mode'))
    const conditions = list(params.get('condition')) as ItemCondition[]
    const urgent = params.get('urgent') === 'true'
    const min = nairaParam(params.get('price_min'))
    const max = nairaParam(params.get('price_max'))
    const cursor = Number(params.get('cursor') ?? 0)

    const matches = listingsDb
      .details()
      // Public results only show listings that can take offers (PRD DSC-02).
      .filter((l) => l.status === 'ACTIVE')
      .filter((l) => !q || l.title.toLowerCase().includes(q))
      .filter((l) => categoryIds.length === 0 || categoryIds.includes(l.categoryId))
      .filter((l) => areaNames.length === 0 || areaNames.includes(l.areaName))
      // Modes widen each other: "For sale" or "Open to swap" or "Quick Sell"
      .filter(
        (l) =>
          modes.length === 0 ||
          modes.some((m) =>
            m === 'QUICK_SELL' ? Boolean(l.urgencyEndsAt) : l.acceptedModes.includes(m as 'CASH' | 'SWAP'),
          ),
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

    const listing = listingsDb.byIdOrSlug(String(params.slug))?.detail
    // Drafts and listings under review aren't public yet
    if (!listing || listing.status === 'DRAFT' || listing.status === 'PENDING_REVIEW') {
      return notFound('Listing not found')
    }
    return HttpResponse.json(toPublicDetail(listing))
  }),

  http.get(`${API}/users/:id`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure

    const profile = authDb.publicProfile(String(params.id))
    return profile ? HttpResponse.json<PublicProfile>(profile) : notFound('Person not found')
  }),

  http.get(`${API}/users/:id/listings`, async ({ params }) => {
    const failure = await network()
    if (failure) return failure

    if (!authDb.publicProfile(String(params.id))) return notFound('Person not found')
    const items = listingsDb
      .details()
      .filter((l) => l.seller.id === params.id && l.status === 'ACTIVE')
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .map(toSummary)
    return HttpResponse.json<Paginated<ListingSummary>>({ items, nextCursor: null, total: items.length })
  }),
]

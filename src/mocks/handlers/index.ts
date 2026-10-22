import { delay, http, HttpResponse, type RequestHandler } from 'msw'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { listings } from '@/mocks/fixtures/listings'
import { useDevSettings } from '@/mocks/dev-settings'
import type { ListingSummary, Paginated } from '@/types/api'

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

const toSummary = ({ sellerId: _sellerId, ...summary }: (typeof listings)[number]): ListingSummary => summary

export const handlers: RequestHandler[] = [
  http.get(`${API}/config`, async () => (await network()) ?? HttpResponse.json(runtimeConfig)),

  http.get(`${API}/listings`, async ({ request }) => {
    const failure = await network()
    if (failure) return failure

    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim().toLowerCase()
    const category = params.get('category')
    const area = params.get('area')
    const mode = params.get('mode')
    const urgent = params.get('urgent') === 'true'
    const cursor = Number(params.get('cursor') ?? 0)

    const matches = listings
      // Public results only show listings that can take offers (PRD DSC-02).
      .filter((l) => l.status === 'ACTIVE')
      .filter((l) => !q || l.title.toLowerCase().includes(q))
      .filter((l) => !category || l.categoryId === category)
      .filter((l) => !area || runtimeConfig.areas.find((a) => a.id === area)?.name === l.areaName)
      .filter((l) => !mode || l.acceptedModes.includes(mode as 'CASH' | 'SWAP'))
      .filter((l) => !urgent || Boolean(l.urgencyEndsAt))
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
    return HttpResponse.json(toSummary(listing))
  }),
]

// Share previews for /listings/:slug (PRD §4.3, FE-SEO-02/03). Link-preview scrapers don't run JavaScript,
// so this function puts the listing's tags into the built index.html before it's served.
// Framework-neutral (standard Request/Response): the hosting adapter is chosen later (FE-D-02).
import { buildListingMeta, injectMeta, type ListingMetaInput } from '../src/lib/seo/listing-meta'

export type FetchListing = (slug: string, signal: AbortSignal) => Promise<ListingMetaInput | null>

type Deps = {
  fetchListing: FetchListing
  /** The built dist/index.html. */
  indexHtml: string
  /** Scrapers give up quickly; never hold the page for a slow API. */
  timeoutMs?: number
}

const LISTING_PATH = /^\/listings\/([^/]+)\/?$/
// /listings/new is the wizard, not a listing
const RESERVED_SLUGS = new Set(['new'])

const html = (body: string, cacheControl: string) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl } })

export async function handleListingOg(request: Request, { fetchListing, indexHtml, timeoutMs = 800 }: Deps): Promise<Response> {
  const url = new URL(request.url)
  const match = LISTING_PATH.exec(url.pathname)
  const slug = match?.[1] ? decodeURIComponent(match[1]) : null
  if (!slug || RESERVED_SLUGS.has(slug)) return html(indexHtml, 'public, max-age=60')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const listing = await Promise.race([
      fetchListing(slug, controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('timeout')))),
    ])
    const meta = buildListingMeta(listing, { origin: url.origin })
    // Short cache so price and availability stay close to real time
    return html(injectMeta(indexHtml, meta.tags), 'public, max-age=60, stale-while-revalidate=300')
  } catch {
    // Never fail the page: scrapers get the brand defaults, and the SPA still boots
    return html(injectMeta(indexHtml, buildListingMeta(null, { origin: url.origin }).tags), 'public, max-age=10')
  } finally {
    clearTimeout(timer)
  }
}

/** Reads the public listing summary from the API; 404 means "unknown slug", other failures throw. */
export function createApiFetcher(apiBase: string, fetchImpl: typeof fetch = fetch): FetchListing {
  return async (slug, signal) => {
    const res = await fetchImpl(`${apiBase}/listings/${encodeURIComponent(slug)}`, { signal, headers: { accept: 'application/json' } })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Listing API responded ${res.status}`)
    const data = (await res.json()) as ListingMetaInput
    // Keep only public-safe fields, whatever else the API sends
    const { slug: s, title, areaName, condition, acceptedModes, askingKobo, status, cover } = data
    return { slug: s, title, areaName, condition, acceptedModes, askingKobo, status, cover }
  }
}

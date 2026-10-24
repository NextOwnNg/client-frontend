import { describe, expect, it, vi } from 'vitest'
import { createApiFetcher, handleListingOg } from './listing-og'
import type { ListingMetaInput } from '../src/lib/seo/listing-meta'

const indexHtml = `<!doctype html><html><head>
    <title>NextOwn · Turn what you own into what you want</title>
    <meta property="og:title" content="NextOwn · Find your next thing" />
  </head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>`

const listing: ListingMetaInput = {
  slug: 'ps5-disc-edition',
  title: 'PS5 Disc Edition',
  areaName: 'Yaba',
  condition: 'FAIR',
  acceptedModes: ['SWAP'],
  askingKobo: null,
  status: 'ACTIVE',
  cover: { url: 'https://cdn.example.com/ps5.jpg', alt: 'PS5 console', width: 1200, height: 630 },
}

const request = (path: string) => new Request(`https://www.nextown.ng${path}`)

describe('handleListingOg', () => {
  it('injects the listing tags and caches briefly at the edge', async () => {
    const fetchListing = vi.fn().mockResolvedValue(listing)
    const res = await handleListingOg(request('/listings/ps5-disc-edition?ref=wa'), { fetchListing, indexHtml })
    const html = await res.text()

    expect(fetchListing).toHaveBeenCalledWith('ps5-disc-edition', expect.any(AbortSignal))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=60, stale-while-revalidate=300')
    expect(html).toContain('<title>PS5 Disc Edition · Yaba · NextOwn</title>')
    expect(html).toContain('content="https://cdn.example.com/ps5.jpg"')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('serves the default tags with 200 when the API is slower than the timeout', async () => {
    const fetchListing = vi.fn(
      (_slug: string, signal: AbortSignal) =>
        new Promise<ListingMetaInput>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    )
    const res = await handleListingOg(request('/listings/ps5-disc-edition'), { fetchListing, indexHtml, timeoutMs: 20 })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('<title>NextOwn · Turn what you own into what you want</title>')
    expect(res.headers.get('cache-control')).toBe('public, max-age=10')
  })

  it('serves the default tags with 200 when the API errors', async () => {
    const res = await handleListingOg(request('/listings/ps5-disc-edition'), {
      fetchListing: vi.fn().mockRejectedValue(new Error('503')),
      indexHtml,
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toContain('NextOwn · Turn what you own into what you want')
  })

  it('serves the default tags for an unknown slug, and noindex for a removed listing', async () => {
    const unknown = await handleListingOg(request('/listings/nope'), {
      fetchListing: vi.fn().mockResolvedValue(null),
      indexHtml,
    })
    const removed = await handleListingOg(request('/listings/ps5-disc-edition'), {
      fetchListing: vi.fn().mockResolvedValue({ ...listing, status: 'REMOVED' }),
      indexHtml,
    })

    expect(await unknown.text()).toContain('NextOwn · Turn what you own into what you want')
    const removedHtml = await removed.text()
    expect(removedHtml).toContain('noindex, nofollow')
    expect(removedHtml).not.toContain('PS5')
  })

  it('leaves other paths untouched', async () => {
    const fetchListing = vi.fn()
    const res = await handleListingOg(request('/explore'), { fetchListing, indexHtml })

    expect(fetchListing).not.toHaveBeenCalled()
    expect(await res.text()).toBe(indexHtml)
  })
})

describe('createApiFetcher', () => {
  it('maps 404 to null, picks only public fields, and throws on server errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...listing, phone: '+2348000000000' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    const fetchListing = createApiFetcher('https://api.nextown.ng/v1', fetchImpl)
    const signal = new AbortController().signal

    const found = await fetchListing('ps5-disc-edition', signal)
    expect(found).toEqual(listing)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.nextown.ng/v1/listings/ps5-disc-edition',
      expect.objectContaining({ signal }),
    )
    expect(await fetchListing('nope', signal)).toBeNull()
    await expect(fetchListing('ps5-disc-edition', signal)).rejects.toThrow()
  })
})

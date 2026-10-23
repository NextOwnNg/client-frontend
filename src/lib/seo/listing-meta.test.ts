import { describe, expect, it } from 'vitest'
import { buildListingMeta, injectMeta, type ListingMetaInput } from '@/lib/seo/listing-meta'

const origin = 'https://www.nextown.ng'

const iphone: ListingMetaInput = {
  slug: 'iphone-12-pro-128gb',
  title: 'iPhone 12 Pro · 128GB',
  areaName: 'Yaba',
  condition: 'GOOD',
  acceptedModes: ['CASH', 'SWAP'],
  askingKobo: 385_000_00,
  status: 'ACTIVE',
  cover: { url: '/mock/items/iphone-12-pro.jpg', alt: 'Silver iPhone 12 Pro, back view', width: 427, height: 800 },
}

const tag = (meta: ReturnType<typeof buildListingMeta>, key: string) =>
  meta.tags.find((t) => (t.kind === 'meta' && t.key === key) || (t.kind === 'link' && key === 'canonical'))

describe('buildListingMeta', () => {
  it('titles a listing "{item} · {area} · NextOwn"', () => {
    const meta = buildListingMeta(iphone, { origin })

    expect(meta.title).toBe('iPhone 12 Pro · 128GB · Yaba · NextOwn')
    expect(meta.tags[0]).toEqual({ kind: 'title', content: meta.title })
  })

  it('describes condition, price and modes, as the app formats them', () => {
    expect(buildListingMeta(iphone, { origin }).description).toBe(
      'Good condition · ₦385,000 · Also open to swap · Yaba. Make an offer on NextOwn.',
    )
  })

  it('says "Open to swap" instead of a price for swap-only listings', () => {
    const meta = buildListingMeta({ ...iphone, acceptedModes: ['SWAP'], askingKobo: null }, { origin })

    expect(meta.description).toBe('Good condition · Open to swap · Yaba. Make an offer on NextOwn.')
  })

  it('states unavailability truthfully for reserved, expired and closed listings', () => {
    expect(buildListingMeta({ ...iphone, status: 'RESERVED' }, { origin }).description).toMatch(/^Reserved: no longer accepting offers\./)
    expect(buildListingMeta({ ...iphone, status: 'EXPIRED' }, { origin }).description).toMatch(/^Expired: no longer accepting offers\./)
    expect(buildListingMeta({ ...iphone, status: 'CLOSED' }, { origin }).description).toMatch(/^Closed: no longer accepting offers\./)
    expect(buildListingMeta({ ...iphone, status: 'RESERVED' }, { origin }).noindex).toBe(false)
  })

  it('returns generic tags and noindex for a removed listing', () => {
    const meta = buildListingMeta({ ...iphone, status: 'REMOVED' }, { origin })

    expect(meta.noindex).toBe(true)
    expect(meta.title).not.toContain('iPhone')
    expect(meta.description).not.toContain('iPhone')
    expect(meta.image).toBe(`${origin}/brand/og-default.png`)
    expect(tag(meta, 'robots')).toMatchObject({ content: 'noindex, nofollow' })
  })

  it('falls back to the brand defaults when the listing is unknown', () => {
    const meta = buildListingMeta(null, { origin })

    expect(meta.title).toBe('NextOwn · Turn what you own into what you want')
    expect(meta.image).toBe(`${origin}/brand/og-default.png`)
    expect(meta.noindex).toBe(false)
  })

  it('uses the real cover photo as an absolute og:image with its size and alt text', () => {
    const meta = buildListingMeta(iphone, { origin })

    expect(meta.image).toBe(`${origin}/mock/items/iphone-12-pro.jpg`)
    expect(tag(meta, 'og:image:alt')).toMatchObject({ content: 'Silver iPhone 12 Pro, back view' })
    expect(tag(meta, 'og:image:width')).toMatchObject({ content: '427' })
    expect(tag(meta, 'twitter:card')).toMatchObject({ content: 'summary_large_image' })
    expect(tag(meta, 'canonical')).toMatchObject({ href: `${origin}/listings/iphone-12-pro-128gb` })
  })

  it('never carries private fields, even if the API sent them', () => {
    const leaky = { ...iphone, phone: '+2348012345678', address: '12 Example Street' } as ListingMetaInput
    const json = JSON.stringify(buildListingMeta(leaky, { origin }))

    expect(json).not.toContain('2348012345678')
    expect(json).not.toContain('Example Street')
  })
})

describe('injectMeta', () => {
  const html = `<!doctype html><html><head>
    <title>NextOwn · Turn what you own into what you want</title>
    <meta name="description" content="default" />
    <meta property="og:title" content="default" />
    <meta property="og:image" content="default.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" />
  </head><body><div id="root"></div></body></html>`

  it('replaces the default tags and keeps everything else', () => {
    const out = injectMeta(html, buildListingMeta(iphone, { origin }).tags)

    expect(out).toContain('<title>iPhone 12 Pro · 128GB · Yaba · NextOwn</title>')
    expect(out).not.toContain('content="default"')
    expect(out).not.toContain('default.png')
    expect(out.match(/<title>/g)).toHaveLength(1)
    expect(out.match(/twitter:card/g)).toHaveLength(1)
    expect(out).toContain('<link rel="icon" href="/favicon.svg" />')
    expect(out).toContain('<div id="root"></div>')
  })

  it('escapes listing text so a title cannot break out of the tag', () => {
    const out = injectMeta(html, buildListingMeta({ ...iphone, title: 'Fan "big" <script>alert(1)</script> & co' }, { origin }).tags)

    expect(out).not.toContain('<script>alert(1)</script>')
    expect(out).toContain('Fan &quot;big&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; co')
  })
})

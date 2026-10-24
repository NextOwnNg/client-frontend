// Shared by React Helmet (in the app) and edge/listing-og.ts (for link-preview scrapers), so the two never
// disagree (PRD §4.3). Pure and dependency-light: relative imports only, nothing that touches the DOM.
import { conditionLabel } from '../copy/labels'
import { formatNaira } from '../money/money'
import type { ListingSummary } from '../../types/api'

/** The public-safe fields a preview may use. Anything else on the input is ignored. */
export type ListingMetaInput = Pick<
  ListingSummary,
  'slug' | 'title' | 'areaName' | 'condition' | 'acceptedModes' | 'askingKobo' | 'status' | 'cover'
>

export type MetaTag =
  | { kind: 'title'; content: string }
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; content: string }
  | { kind: 'link'; rel: 'canonical'; href: string }

export type ListingMeta = {
  title: string
  description: string
  canonical?: string
  image: string
  noindex: boolean
  tags: MetaTag[]
}

export const DEFAULT_TITLE = 'NextOwn · Turn what you own into what you want'
export const DEFAULT_DESCRIPTION =
  'Sell what you no longer need, swap for something better, or add cash to make the exchange work.'
const DEFAULT_IMAGE = '/brand/og-default.png'
const DEFAULT_IMAGE_ALT = 'NextOwn logo with the line: Turn what you own into what you want.'

const unavailable: Partial<Record<ListingSummary['status'], string>> = {
  RESERVED: 'Reserved: no longer accepting offers.',
  EXPIRED: 'Expired: no longer accepting offers.',
  CLOSED: 'Closed: no longer accepting offers.',
  COMPLETED: 'Completed: no longer accepting offers.',
}

/** Statuses that must not be previewed or indexed: only generic tags go out. */
const hidden: ListingSummary['status'][] = ['REMOVED', 'DRAFT', 'PENDING_REVIEW']

const absolute = (url: string, origin: string) =>
  /^https?:\/\//.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`

function describe(listing: ListingMetaInput): string {
  const swap = listing.acceptedModes.includes('SWAP')
  const parts = [`${conditionLabel(listing.condition)} condition`]
  if (listing.askingKobo !== null && listing.acceptedModes.includes('CASH')) {
    parts.push(formatNaira(listing.askingKobo))
    if (swap) parts.push('Also open to swap')
  } else if (swap) {
    parts.push('Open to swap')
  }
  parts.push(listing.areaName)
  const facts = `${parts.join(' · ')}.`
  const status = unavailable[listing.status]
  return status ? `${status} ${facts}` : `${facts} Make an offer on NextOwn.`
}

function toTags(meta: Omit<ListingMeta, 'tags'>, image: { alt: string; width?: number; height?: number }): MetaTag[] {
  const prop = (key: string, content: string): MetaTag => ({ kind: 'meta', attr: 'property', key, content })
  const name = (key: string, content: string): MetaTag => ({ kind: 'meta', attr: 'name', key, content })

  const tags: MetaTag[] = [
    { kind: 'title', content: meta.title },
    name('description', meta.description),
    prop('og:type', 'website'),
    prop('og:site_name', 'NextOwn'),
    prop('og:title', meta.title),
    prop('og:description', meta.description),
    prop('og:image', meta.image),
    prop('og:image:alt', image.alt),
  ]
  if (image.width && image.height)
    tags.push(prop('og:image:width', String(image.width)), prop('og:image:height', String(image.height)))
  tags.push(
    name('twitter:card', 'summary_large_image'),
    name('twitter:title', meta.title),
    name('twitter:description', meta.description),
    name('twitter:image', meta.image),
  )
  if (meta.canonical)
    tags.push({ kind: 'link', rel: 'canonical', href: meta.canonical }, prop('og:url', meta.canonical))
  if (meta.noindex) tags.push(name('robots', 'noindex, nofollow'))
  return tags
}

/** Head tags for /listings/:slug. `null` (unknown slug or API failure) gives the brand defaults. */
export function buildListingMeta(listing: ListingMetaInput | null, { origin }: { origin: string }): ListingMeta {
  if (!listing || hidden.includes(listing.status)) {
    const base = {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      image: absolute(DEFAULT_IMAGE, origin),
      noindex: Boolean(listing),
    }
    return { ...base, tags: toTags(base, { alt: DEFAULT_IMAGE_ALT, width: 1200, height: 630 }) }
  }

  const base = {
    title: `${listing.title} · ${listing.areaName} · NextOwn`,
    description: describe(listing),
    canonical: `${origin}/listings/${encodeURIComponent(listing.slug)}`,
    image: absolute(listing.cover.url, origin),
    noindex: false,
  }
  return { ...base, tags: toTags(base, listing.cover) }
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function renderTag(tag: MetaTag): string {
  if (tag.kind === 'title') return `<title>${escapeHtml(tag.content)}</title>`
  if (tag.kind === 'link') return `<link rel="canonical" href="${escapeHtml(tag.href)}" />`
  return `<meta ${tag.attr}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}" />`
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Swaps the default head tags in the built index.html for the listing's own; leaves everything else alone. */
export function injectMeta(html: string, tags: MetaTag[]): string {
  let out = html.replace(/\s*<title>[\s\S]*?<\/title>/i, '')
  out = out.replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
  for (const tag of tags) {
    if (tag.kind !== 'meta') continue
    const pattern = new RegExp(`\\s*<meta\\s+${tag.attr}="${escapeRegExp(tag.key)}"[^>]*>`, 'gi')
    out = out.replace(pattern, '')
  }
  const block = tags.map((t) => `    ${renderTag(t)}`).join('\n')
  return out.replace(/<\/head>/i, `${block}\n  </head>`)
}

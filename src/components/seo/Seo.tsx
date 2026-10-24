import { Helmet } from 'react-helmet-async'
import { DEFAULT_TITLE, type MetaTag } from '@/lib/seo/listing-meta'

const SITE_NAME = 'NextOwn'

type SeoProps = {
  /** Page title without the site name; omit for the default home title. */
  title?: string
  description?: string
  /** Absolute canonical URL. */
  canonical?: string
  image?: string
  noindex?: boolean
  /**
   * A complete tag set from lib/seo (listing pages). Rendered as-is so the in-app tags match what the
   * share-preview function sends to scrapers.
   */
  tags?: MetaTag[]
}

function renderTag(tag: MetaTag) {
  if (tag.kind === 'title') return <title key="title">{tag.content}</title>
  if (tag.kind === 'link') return <link key="canonical" rel="canonical" href={tag.href} />
  return tag.attr === 'name' ? (
    <meta key={tag.key} name={tag.key} content={tag.content} />
  ) : (
    <meta key={tag.key} property={tag.key} content={tag.content} />
  )
}

/** Per-route head tags (PRD §4.2, FE-SEO-01). Member and auth routes pass `noindex`. */
export function Seo({ title, description, canonical, image, noindex = false, tags }: SeoProps) {
  if (tags) return <Helmet>{tags.map(renderTag)}</Helmet>

  const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  )
}

import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'NextOwn'

type SeoProps = {
  /** Page title without the site name; omit for the default home title. */
  title?: string
  description?: string
  /** Absolute canonical URL. */
  canonical?: string
  image?: string
  noindex?: boolean
}

/** Per-route head tags (PRD §4.2). Listing pages build their props with lib/seo. */
export function Seo({ title, description, canonical, image, noindex = false }: SeoProps) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Turn what you own into what you want`

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

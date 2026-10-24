# Edge functions

## `listing-og.ts`: listing share previews (PRD §4.3, FE-SEO-02/03)

WhatsApp, Facebook, X, Telegram and LinkedIn don't run JavaScript, so they only see the static `index.html`.
`handleListingOg` sits in front of the SPA for `GET /listings/:slug`. It reads the public listing summary,
puts the listing's `<title>`, description, canonical, `og:*` and `twitter:*` tags into the built
`index.html`, and returns it. React Helmet takes over in the browser using the same builder
(`src/lib/seo/listing-meta.ts`), so in-app tags and previews never disagree.

- Times out after 800 ms. Timeout, API error or unknown slug: 200 with the brand defaults (`max-age=10`).
- Success: `public, max-age=60, stale-while-revalidate=300`.
- Removed (and draft or under-review) listings: generic tags plus `noindex`.
- Only public-safe fields are read: title, area, condition, modes, price, status, cover.

The function uses standard `Request`/`Response`, so it runs on any edge runtime. Hosting isn't chosen yet
(FE-D-02). A Netlify-style adapter looks like:

```ts
import indexHtml from '../dist/index.html?raw'
import { createApiFetcher, handleListingOg } from './listing-og'

const fetchListing = createApiFetcher(process.env.API_BASE_URL!)
export default (request: Request) => handleListingOg(request, { fetchListing, indexHtml })
export const config = { path: '/listings/*' }
```

Before launch, check a listing link in each platform's preview debugger (Facebook Sharing Debugger,
X Card Validator, and a WhatsApp message to yourself). `og:image` should then point to a 1200 × 630 JPEG
variant of the cover under 300 KB, served by the image API.

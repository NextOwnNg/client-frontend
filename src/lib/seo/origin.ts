/** Absolute site origin for canonicals and og:url. Set VITE_SITE_ORIGIN in production builds. */
export function siteOrigin(): string {
  return import.meta.env.VITE_SITE_ORIGIN ?? window.location.origin
}

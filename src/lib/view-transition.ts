/** Shared-element name for a listing's cover photo (card → detail). Slugs are already ident-safe; this guards it. */
export function coverTransitionName(slug: string): string {
  return `cover-${slug.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

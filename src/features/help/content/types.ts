/**
 * Help and policy pages are data, so the final legal text can replace the pilot drafts without touching the
 * layout (ruling R7-6). Plain strings only: no markup, no claims the product doesn't keep.
 */
export type PolicyLink = { to: string; label: string }

export type PolicySection = {
  /** The anchor: `/community-rules#prohibited`. */
  id: string
  title: string
  paragraphs?: string[]
  /** A bulleted list after the paragraphs. */
  list?: string[]
  /** Numbered steps after the paragraphs. */
  steps?: { title: string; body: string }[]
  links?: PolicyLink[]
}

export type PolicyDoc = {
  title: string
  /** One or two sentences under the heading; also the page description for search and sharing. */
  lead: string
  /** Set for pages awaiting legal sign-off (BR-04, D-02). */
  draft?: string
  updated?: string
  sections: PolicySection[]
  related: PolicyLink[]
}

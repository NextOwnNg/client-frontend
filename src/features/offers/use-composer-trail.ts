import { useLocation, useNavigate } from 'react-router'

/**
 * How the visitor got into the offer composer, carried in history state. Every step is its own history entry
 * (so the phone's Back moves between steps), and `depth` counts them, so leaving can skip all of them.
 */
type ComposerTrail = { fromListing?: boolean; depth?: number }

/** History state for opening the composer from a listing page. */
export const fromListingTrail: ComposerTrail = { fromListing: true, depth: 1 }

export function useComposerTrail(listingSlug: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const trail = (location.state ?? {}) as ComposerTrail
  const depth = trail.depth ?? 1

  return {
    /** State for moving to another step: one entry deeper. */
    stepState: { fromListing: trail.fromListing, depth: depth + 1 } satisfies ComposerTrail,
    /**
     * Back to the item. From the listing, go back past every step to that same entry, so its Back still leads
     * where the visitor was before. From anywhere else, open the listing and tell its Back to skip the steps
     * too; a plain link here made Back bounce between the listing and the offer.
     */
    backToItem: () =>
      trail.fromListing
        ? void navigate(-depth)
        : void navigate(`/listings/${listingSlug}`, { state: { backSteps: depth + 1 } }),
  }
}

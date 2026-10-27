import { useToggleSave } from '@/features/saved/api'
import type { ListingSummary } from '@/types/api'

/** Takes a listing out of Saved in one tap, whatever state the listing is in. */
export function RemoveSavedButton({ listing }: { listing: ListingSummary }) {
  const toggle = useToggleSave()
  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ kind: 'listing', id: listing.id, on: false })}
      aria-label={`Remove ${listing.status === 'REMOVED' ? 'removed listing' : listing.title} from saved`}
      className="inline-flex min-h-11 items-center rounded-control px-3 text-compact font-semibold text-action transition-colors duration-120 pointer-fine:hover:bg-mint"
    >
      Remove
    </button>
  )
}

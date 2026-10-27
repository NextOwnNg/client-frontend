import { Bookmark } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ListingRow } from '@/features/listings/components/ListingCards'
import { useSavedIds, useSavedListings } from '@/features/saved/api'
import { RemoveSavedButton } from '@/features/saved/components/RemoveSavedButton'
import { SavedSkeleton } from '@/features/saved/components/SavedSkeleton'

/** The Listings tab: each saved listing in its true state, with Remove (FE-SAV-01). */
export function SavedListings() {
  const { data, isPending, isError, refetch } = useSavedListings()
  const ids = useSavedIds().data?.listings
  // Unsaving hides the row at once, before the list is fetched again
  const items = data?.filter((l) => !ids || ids.includes(l.id)) ?? []

  if (isPending) return <SavedSkeleton />
  if (isError) return <ErrorState title="We couldn't load your saved items" onRetry={() => void refetch()} />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        body="Tap Save on an item you like to keep it here. You’ll see if it’s still available."
        action={<ButtonLink to="/explore">Explore items</ButtonLink>}
      />
    )
  }
  return (
    <>
      <h2 className="sr-only">Saved listings</h2>
      <ul aria-label="Saved listings" className="grid gap-2 tablet:grid-cols-2 tablet:gap-x-4">
        {items.map((listing) => (
          <li key={listing.id} className="flex flex-col">
            {listing.status === 'REMOVED' ? (
              <div className="flex h-30 flex-col justify-center rounded-card border border-dashed border-border bg-surface px-4">
                <p className="text-body font-semibold text-muted">Listing removed</p>
                <p className="text-compact text-muted">This item is no longer on NextOwn.</p>
              </div>
            ) : (
              <ListingRow listing={listing} />
            )}
            <div className="-mb-2 flex justify-end">
              <RemoveSavedButton listing={listing} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

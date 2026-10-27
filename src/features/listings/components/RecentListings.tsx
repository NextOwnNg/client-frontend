import { ArrowRight, MapPin, PackageOpen } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { ListingRowSkeleton, ListingTileSkeleton } from '@/components/ui/Skeletons'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useListings } from '@/features/listings/api'
import { ListingRow, ListingTile } from '@/features/listings/components/ListingCards'
import { areaSummary, defaultFilters, serializeFilters } from '@/features/listings/filters'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'
import type { RuntimeConfig } from '@/types/api'

const SHOWN = 6

type RecentListingsProps = {
  areaIds: string[]
  config?: RuntimeConfig
  onChooseArea: () => void
  onPreloadArea: () => void
  onAllAreas: () => void
}

/** Home's "recently listed near you" (FE-HOM-01/03). The areas are the ones the visitor chose, never detected. */
export function RecentListings({ areaIds, config, onChooseArea, onPreloadArea, onAllAreas }: RecentListingsProps) {
  const tiles = useMediaQuery(breakpoints.tablet)
  const filters = { ...defaultFilters, areas: areaIds }
  const { data, isPending, isError, refetch } = useListings(filters)
  const city = config?.cityName ?? 'the pilot city'
  const place = areaSummary(areaIds, config, city)
  const items = data?.pages[0]?.items.slice(0, SHOWN) ?? []
  const query = serializeFilters(filters).toString()
  const grid = 'grid grid-cols-1 gap-3 tablet:grid-cols-2 tablet:gap-4 desktop:grid-cols-3'

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id="recent-heading" className="text-h3 text-ink tablet:text-h2">
          Recently listed in {place}
        </h2>
        {items.length > 0 && (
          <Link
            to={query ? `/explore?${query}` : '/explore'}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            See all
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>

      {areaIds.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-mint px-4 py-3">
          <p className="flex items-center gap-2 text-compact text-ink">
            <MapPin aria-hidden className="size-4 shrink-0 text-action" />
            Pick your area to see what's near you. We never ask for your location.
          </p>
          <PlainButton
            variant="secondary"
            size="sm"
            onClick={onChooseArea}
            onPointerEnter={onPreloadArea}
            onFocus={onPreloadArea}
          >
            Choose your area
          </PlainButton>
        </div>
      )}

      {isPending ? (
        <div aria-busy="true" aria-label="Loading recent listings" className={grid}>
          {Array.from({ length: 3 }, (_, i) =>
            tiles ? <ListingTileSkeleton key={i} /> : <ListingRowSkeleton key={i} />,
          )}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load recent listings" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={`Nothing listed in ${place} yet`}
          body="The pilot is just starting here. Look across the whole city, or be the first to list something."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {areaIds.length > 0 && (
                <PlainButton variant="secondary" onClick={onAllAreas}>
                  See all areas
                </PlainButton>
              )}
              <ButtonLink to="/listings/new">List an item</ButtonLink>
            </div>
          }
        />
      ) : (
        <ul aria-label="Recent listings" className={grid}>
          {items.map((listing) => (
            <li key={listing.id} className="min-w-0">
              {tiles ? <ListingTile listing={listing} /> : <ListingRow listing={listing} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

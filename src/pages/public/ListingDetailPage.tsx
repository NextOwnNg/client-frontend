import { useQueryClient } from '@tanstack/react-query'
import { PackageX, SearchX } from 'lucide-react'
import { useParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { BackButton } from '@/components/ui/BackButton'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { listingQueryOptions, useListing } from '@/features/listings/api'
import { Gallery } from '@/features/listings/components/Gallery'
import {
  ConditionAndDefects,
  ListingBody,
  ListingHeader,
  OfferActions,
  SellerCard,
} from '@/features/listings/components/ListingDetail'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'
import { isApiError } from '@/lib/api/api-error'
import { buildListingMeta } from '@/lib/seo/listing-meta'
import { siteOrigin } from '@/lib/seo/origin'

function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading listing"
      className="flex flex-col gap-4 desktop:grid desktop:grid-cols-[minmax(0,1fr)_24rem] desktop:gap-10"
    >
      <div className="-mx-4 aspect-[4/3] animate-pulse bg-mint tablet:mx-0 tablet:rounded-card" />
      <div className="flex flex-col gap-3">
        <div className="h-5 w-1/3 animate-pulse rounded bg-cloud" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-cloud" />
        <div className="h-7 w-1/3 animate-pulse rounded bg-cloud" />
      </div>
    </div>
  )
}

/** UX-04 listing detail. Shows the evidence first; offers are only possible while the listing is truly available. */
export function ListingDetailPage() {
  return (
    <>
      <BackButton
        fallbackTo="/explore"
        fallbackLabel="Explore more items"
        className="-mt-2 mb-1 desktop:mt-0 desktop:mb-4"
      />
      <ListingDetailContent />
    </>
  )
}

function ListingDetailContent() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const desktop = useMediaQuery(breakpoints.desktop)
  const { data: listing, error, isPending, isPlaceholderData, refetch } = useListing(slug)

  if (isPending) return <DetailSkeleton />

  if (error && !listing) {
    if (isApiError(error) && error.status === 404) {
      return (
        <>
          <Seo title="Listing not found" noindex />
          <EmptyState
            icon={SearchX}
            title="We couldn't find that listing"
            body="The link may be mistyped, or the listing was never published."
            action={<ButtonLink to="/explore">Explore items</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this listing" onRetry={() => void refetch()} />
  }

  const meta = buildListingMeta(listing, { origin: siteOrigin() })

  if (listing.status === 'REMOVED') {
    return (
      <>
        <Seo tags={meta.tags} />
        <EmptyState
          icon={PackageX}
          title="This listing is no longer available"
          body="It was removed from NextOwn. Similar items may be listed near you."
          action={<ButtonLink to="/explore">Explore items</ButtonLink>}
        />
      </>
    )
  }

  // While the card's summary stands in for the detail, only summary fields are real
  const full = !isPlaceholderData
  const recheck = () =>
    queryClient.fetchQuery({ ...listingQueryOptions(queryClient, slug), staleTime: 0 }).catch(() => undefined)

  return (
    <article className="pb-28 desktop:grid desktop:grid-cols-[minmax(0,1fr)_24rem] desktop:items-start desktop:gap-x-10 desktop:pb-0">
      <Seo tags={meta.tags} />

      <div className="desktop:col-start-1 desktop:row-start-1">
        <Gallery images={full ? listing.images : [listing.cover]} slug={listing.slug} />
      </div>

      <div className="mt-5 flex flex-col gap-5 desktop:sticky desktop:top-24 desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:mt-0">
        <ListingHeader listing={listing} />
        {full ? (
          <>
            <SellerCard listing={listing} />
            <ConditionAndDefects listing={listing} />
            {desktop && <OfferActions listing={listing} recheck={recheck} layout="panel" />}
          </>
        ) : (
          <div aria-hidden className="flex flex-col gap-3">
            <div className="h-28 animate-pulse rounded-card bg-cloud" />
            <div className="h-20 animate-pulse rounded-card bg-cloud" />
          </div>
        )}
      </div>

      {full && (
        <div className="mt-8 desktop:col-start-1 desktop:row-start-2">
          <ListingBody listing={listing} />
        </div>
      )}

      {full && !desktop && <OfferActions listing={listing} recheck={recheck} layout="bar" />}
    </article>
  )
}

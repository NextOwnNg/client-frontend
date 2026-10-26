import type { ReactNode } from 'react'
import { Gallery } from '@/features/listings/components/Gallery'
import {
  ConditionAndDefects,
  ListingBody,
  ListingHeader,
  SellerCard,
} from '@/features/listings/components/ListingDetail'
import type { ListingDetail } from '@/types/api'

export type ListingSection = 'photos' | 'trade' | 'condition' | 'details'

type ListingViewProps = {
  listing: ListingDetail
  /** False while a card's summary stands in for the detail: only summary fields are real. */
  full?: boolean
  /** The decision panel on desktop (offer actions, or publish in a preview). */
  panel?: ReactNode
  /** The sticky bar on phones. */
  bar?: ReactNode
  /** Per-section edit links in the wizard preview (FE-LST-06). */
  editLink?: (section: ListingSection) => ReactNode
  /** `h2` inside a page that has its own title (the wizard preview). */
  titleAs?: 'h1' | 'h2'
}

/**
 * The listing detail layout (FE-LDT-01), shared by the public page and the wizard's preview so buyers see
 * exactly what the owner previewed (FE-LST-06).
 */
export function ListingView({ listing, full = true, panel, bar, editLink, titleAs }: ListingViewProps) {
  return (
    <article className="pb-28 desktop:grid desktop:grid-cols-[minmax(0,1fr)_24rem] desktop:items-start desktop:gap-x-10 desktop:pb-0">
      <div className="flex flex-col gap-2 desktop:col-start-1 desktop:row-start-1">
        {editLink?.('photos')}
        <Gallery images={full ? listing.images : [listing.cover]} slug={listing.slug} />
      </div>

      <div className="mt-5 flex flex-col gap-5 desktop:sticky desktop:top-24 desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:mt-0">
        <ListingHeader listing={listing} titleAs={titleAs} />
        {editLink?.('trade')}
        {full ? (
          <>
            <SellerCard listing={listing} />
            {editLink?.('condition')}
            <ConditionAndDefects listing={listing} />
            {panel}
          </>
        ) : (
          <div aria-hidden className="flex flex-col gap-3">
            <div className="h-28 animate-pulse rounded-card bg-cloud" />
            <div className="h-20 animate-pulse rounded-card bg-cloud" />
          </div>
        )}
      </div>

      {full && (
        <div className="mt-8 flex flex-col gap-2 desktop:col-start-1 desktop:row-start-2">
          {editLink?.('details')}
          <ListingBody listing={listing} />
        </div>
      )}

      {full && bar}
    </article>
  )
}

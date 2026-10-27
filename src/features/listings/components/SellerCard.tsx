import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { AreaLabel, TrustModule } from '@/components/domain/TrustModule'
import type { ListingDetail } from '@/types/api'

export function SellerCard({ listing }: { listing: ListingDetail }) {
  const { seller } = listing
  return (
    <section
      aria-labelledby="seller-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 id="seller-heading" className="text-caption font-semibold text-muted">
        Listed by
      </h2>
      <div className="flex items-center gap-3">
        <Avatar name={seller.displayName} src={seller.avatarUrl} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-body font-semibold text-ink">{seller.displayName}</p>
          <AreaLabel name={seller.areaName} />
        </div>
        <Link
          to={`/users/${seller.id}`}
          aria-label={`See ${seller.displayName}’s profile`}
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          Profile
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <TrustModule phoneConfirmed={seller.phoneConfirmed} reviewCount={seller.reviewCount} rating={seller.rating} />
    </section>
  )
}

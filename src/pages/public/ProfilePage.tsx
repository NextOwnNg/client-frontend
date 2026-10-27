import { CalendarDays, PackageOpen, UserX } from 'lucide-react'
import { useParams } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { AreaLabel, TrustModule } from '@/components/domain/TrustModule'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { ListingRowSkeleton, ListingTileSkeleton } from '@/components/ui/Skeletons'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { usePublicProfile, useUserListings } from '@/features/account/api'
import { ListingRow, ListingTile } from '@/features/listings/components/ListingCards'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'
import { isNotFound } from '@/lib/api/error-checks'
import { formatMonthYear } from '@/lib/time/time'
import type { PublicProfile } from '@/types/api'

const grid = 'grid grid-cols-1 gap-3 tablet:grid-cols-2 tablet:gap-4 desktop:grid-cols-2 wide:grid-cols-3'

/**
 * UX-25 public profile (FE-PRF-01): accountable facts only. Never a phone number or an exact location, and
 * the rating always carries its count. Sidebar and listings side by side from 1024px.
 */
export function ProfilePage() {
  const { id = '' } = useParams()
  const { data: profile, error, isPending, refetch } = usePublicProfile(id)

  if (isPending) {
    return <div aria-busy="true" aria-label="Loading profile" className="h-40 animate-pulse rounded-card bg-cloud" />
  }
  if (!profile) {
    if (isNotFound(error)) {
      return (
        <>
          <Seo title="Person not found" noindex />
          <EmptyState
            icon={UserX}
            title="We couldn't find that person"
            body="The link may be mistyped, or the account is no longer active."
            action={<ButtonLink to="/explore">Explore items</ButtonLink>}
          />
        </>
      )
    }
    return <ErrorState title="We couldn't load this profile" onRetry={() => void refetch()} />
  }

  return (
    <div className="flex flex-col gap-8 desktop:grid desktop:grid-cols-[20rem_minmax(0,1fr)] desktop:items-start desktop:gap-10">
      <Seo
        title={profile.displayName}
        description={`${profile.displayName} trades on NextOwn in ${profile.areaName}.`}
        canonical={`/users/${profile.id}`}
      />
      <ProfileCard profile={profile} />
      <ActiveListings userId={profile.id} name={profile.displayName} />
    </div>
  )
}

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  return (
    <section
      aria-labelledby="profile-name"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 desktop:sticky desktop:top-24"
    >
      <div className="flex items-center gap-4">
        <Avatar name={profile.displayName} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="profile-name" className="truncate text-h2 text-ink">
            {profile.displayName}
          </h1>
          <AreaLabel name={profile.areaName} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-compact text-muted">
        <CalendarDays aria-hidden className="size-4" />
        Member since {formatMonthYear(profile.memberSince)}
      </p>
      <div className="border-t border-border pt-3">
        <TrustModule
          phoneConfirmed={profile.phoneConfirmed}
          reviewCount={profile.reviewCount}
          rating={profile.rating}
        />
      </div>
    </section>
  )
}

function ActiveListings({ userId, name }: { userId: string; name: string }) {
  const tiles = useMediaQuery(breakpoints.tablet)
  const { data, isPending, isError, refetch } = useUserListings(userId)
  const items = data?.items ?? []

  return (
    <section aria-labelledby="listings-heading" className="flex flex-col gap-4">
      <h2 id="listings-heading" className="text-h3 text-ink">
        Active listings {data && <span className="tabular font-normal text-muted">{items.length}</span>}
      </h2>
      {isPending ? (
        <div aria-busy="true" aria-label="Loading listings" className={grid}>
          {Array.from({ length: 2 }, (_, i) =>
            tiles ? <ListingTileSkeleton key={i} /> : <ListingRowSkeleton key={i} />,
          )}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load these listings" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No active listings right now"
          body={`When ${name} lists something, it will show up here.`}
          action={
            <ButtonLink to="/explore" variant="secondary">
              Explore other items
            </ButtonLink>
          }
        />
      ) : (
        <ul aria-label="Active listings" className={grid}>
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

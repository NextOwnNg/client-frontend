import { Bookmark, Newspaper } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { PostCard } from '@/features/feed/components/PostCard'
import { ListingRow } from '@/features/listings/components/ListingCards'
import { useSavedIds, useSavedListings, useSavedPosts, useToggleSave } from '@/features/saved/api'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'
import type { ListingSummary } from '@/types/api'

type Tab = 'listings' | 'posts'
const tabs: { id: Tab; label: string }[] = [
  { id: 'listings', label: 'Listings' },
  { id: 'posts', label: 'Posts' },
]

const Loading = () => (
  <div aria-busy="true" aria-label="Loading saved items" className="flex flex-col gap-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-30 animate-pulse rounded-card bg-cloud" />
    ))}
  </div>
)

function RemoveButton({ listing }: { listing: ListingSummary }) {
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

function SavedListings() {
  const { data, isPending, isError, refetch } = useSavedListings()
  const ids = useSavedIds().data?.listings
  // Unsaving hides the row at once, before the list is fetched again
  const items = data?.filter((l) => !ids || ids.includes(l.id)) ?? []

  if (isPending) return <Loading />
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
            <RemoveButton listing={listing} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function SavedPosts() {
  const { data, isPending, isError, refetch } = useSavedPosts()
  const ids = useSavedIds().data?.posts
  const userId = useSessionStore((s) => s.userId)
  const now = useServerNow()
  const navigate = useNavigate()
  const items = data?.filter((p) => !ids || ids.includes(p.id)) ?? []

  if (isPending) return <Loading />
  if (isError) return <ErrorState title="We couldn't load your saved posts" onRetry={() => void refetch()} />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No saved posts"
        body="Save a post from the feed to find it again here."
        action={<ButtonLink to="/feed">Go to the feed</ButtonLink>}
      />
    )
  }
  return (
    <ul aria-label="Saved posts" className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {items.map((post) => (
        <li key={post.id}>
          <PostCard
            post={post}
            now={now}
            viewerId={userId}
            onComments={(p) => void navigate(`/feed?post=${p.id}`)}
            onGuestSave={() => {}}
          />
        </li>
      ))}
    </ul>
  )
}

/** UX-26: `/saved`, with Listings and Posts tabs in the URL. Saved items show their true state (FE-SAV-01). */
export function SavedPage() {
  const [params] = useSearchParams()
  const current: Tab = params.get('tab') === 'posts' ? 'posts' : 'listings'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Seo title="Saved" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Saved</h1>
      <nav aria-label="Saved items">
        <ul className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <Link
                to={`?tab=${tab.id}`}
                replace
                aria-current={tab.id === current ? 'page' : undefined}
                className={cx(
                  '-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-compact font-semibold transition-colors duration-120',
                  tab.id === current ? 'border-action text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {current === 'listings' ? <SavedListings /> : <SavedPosts />}
    </div>
  )
}

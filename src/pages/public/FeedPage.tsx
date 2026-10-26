import { Compass, Newspaper, Plus } from 'lucide-react'
import { lazy, Suspense, useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import type { GuestIntent } from '@/features/account/components/GuestPrompt'
import { useRuntimeConfig } from '@/features/config/api'
import { useFeed, usePost } from '@/features/feed/api'
import { PostCard } from '@/features/feed/components/PostCard'
import { useAutoLoad } from '@/hooks/useAutoLoad'
import { siteOrigin } from '@/lib/seo/origin'
import { useServerNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'
import type { FeedPost } from '@/types/api'

// Sheets load when first opened, so the feed itself stays light (PRD §12)
const CommentsSheet = lazy(() =>
  import('@/features/feed/components/CommentsSheet').then((m) => ({ default: m.CommentsSheet })),
)
const GuestPrompt = lazy(() =>
  import('@/features/account/components/GuestPrompt').then((m) => ({ default: m.GuestPrompt })),
)
const ShareSheet = lazy(() => import('@/features/feed/components/ShareSheet').then((m) => ({ default: m.ShareSheet })))

/** FE-FED-04: the way to the full marketplace, at the top of the feed and in its empty state. */
function ExploreLink({ className }: { className?: string }) {
  return (
    <ButtonLink to="/explore" variant="secondary" className={className}>
      <Compass aria-hidden className="size-5" />
      Explore marketplace
    </ButtonLink>
  )
}

function PostSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-full bg-cloud" />
        <div className="h-4 w-32 animate-pulse rounded bg-cloud" />
      </div>
      <div className="aspect-[4/3] animate-pulse rounded-control bg-cloud" />
      <div className="h-4 w-48 animate-pulse rounded bg-cloud" />
    </div>
  )
}

function CategoryRail() {
  const { data } = useRuntimeConfig()
  if (!data) return null
  return (
    <nav aria-label="Browse by category" className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-compact font-semibold text-ink">Browse by category</h2>
      <ul className="mt-2 flex flex-col">
        {data.categories.map((c) => (
          <li key={c.id}>
            <Link
              to={`/explore?category=${encodeURIComponent(c.id)}`}
              className="flex min-h-10 items-center rounded-control px-2 text-compact text-ink transition-colors duration-120 pointer-fine:hover:bg-mint"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * UX-05: `/feed`. Highlights from local members, each tied to a real listing whose price and status are
 * shown as they are now. Comments open in a sheet; the marketplace is always one tap away.
 */
export function FeedPage() {
  const [params, setParams] = useSearchParams()
  const userId = useSessionStore((s) => s.userId)
  const member = useSessionStore((s) => s.status === 'member')
  const now = useServerNow()
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } =
    useFeed()
  const [guest, setGuest] = useState<GuestIntent | null>(null)
  const [sharing, setSharing] = useState(false)

  // The open comments sheet lives in the URL, so a notification or a saved post can open it
  const openId = params.get('post')
  const fromList = data?.find((p) => p.id === openId)
  const linked = usePost(openId && !fromList && !isPending ? openId : null)
  const open = openId ? (fromList ?? linked.data ?? null) : null

  const openComments = (post: FeedPost) => setParams({ post: post.id }, { preventScrollReset: true })
  const closeComments = () => setParams({}, { replace: true, preventScrollReset: true })

  const loadMore = useAutoLoad(
    useCallback(() => void fetchNextPage(), [fetchNextPage]),
    Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError,
  )

  let body
  if (isPending) {
    body = (
      <div aria-busy="true" aria-label="Loading the feed" className="flex flex-col gap-4">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  } else if (isError && !data) {
    body = <ErrorState title="We couldn't load the feed" onRetry={() => void refetch()} />
  } else if (data.length === 0) {
    body = (
      <EmptyState
        icon={Newspaper}
        title="Nothing in the feed yet"
        body="When people near you share their listings, they appear here. The marketplace has everything listed."
        action={<ExploreLink />}
      />
    )
  } else {
    body = (
      <>
        <ul aria-label="Posts" className="flex flex-col gap-4">
          {data.map((post, i) => (
            <li key={post.id}>
              <PostCard
                post={post}
                now={now}
                viewerId={userId}
                priority={i === 0}
                onComments={openComments}
                onGuestSave={() =>
                  setGuest({
                    title: 'Sign in to save posts',
                    body: 'Confirm your phone number to keep posts and items you like. We’ll bring you back to the feed.',
                    next: '/feed',
                  })
                }
              />
            </li>
          ))}
        </ul>
        <div ref={loadMore} className="flex flex-col items-center gap-3 py-6 text-center">
          {isFetchingNextPage ? (
            <div aria-busy="true" aria-label="Loading more posts" className="w-full">
              <PostSkeleton />
            </div>
          ) : isFetchNextPageError ? (
            <div role="alert" className="flex flex-col items-center gap-2">
              <p className="text-compact text-ink">We couldn’t load more posts.</p>
              <PlainButton variant="secondary" onClick={() => void fetchNextPage()}>
                Try again
              </PlainButton>
            </div>
          ) : hasNextPage ? (
            <PlainButton variant="secondary" onClick={() => void fetchNextPage()}>
              Load more posts
            </PlainButton>
          ) : (
            <>
              <p className="text-compact text-muted">You’re all caught up.</p>
              <ExploreLink />
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-content gap-6 desktop:grid-cols-[minmax(0,36rem)_18rem] desktop:justify-center desktop:gap-10">
      <Seo
        title="Feed"
        description="Highlights from people near you, each linked to a real listing you can buy, swap, or swap with cash added."
        canonical={`${siteOrigin()}/feed`}
      />
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 text-ink tablet:text-h1">Feed</h1>
            <p className="text-body text-muted">What people near you are letting go of.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExploreLink className="desktop:hidden" />
            {member && (
              <PlainButton variant="primary" onClick={() => setSharing(true)}>
                <Plus aria-hidden className="size-5" />
                Share a listing
              </PlainButton>
            )}
          </div>
        </div>
        {body}
      </div>

      <aside className="hidden desktop:sticky desktop:top-24 desktop:flex desktop:flex-col desktop:gap-4 desktop:self-start">
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <p className="text-compact text-ink">
            Every item listed near you, with filters for price, condition and swaps.
          </p>
          <ExploreLink />
        </div>
        <CategoryRail />
      </aside>

      <Suspense fallback={null}>
        {guest && <GuestPrompt intent={guest} onClose={() => setGuest(null)} />}
        {open !== null && <CommentsSheet post={open} onClose={closeComments} />}
        {sharing && (
          <ShareSheet
            open={sharing}
            onClose={() => setSharing(false)}
            onShared={() => {
              setSharing(false)
              void import('@heroui/react').then(({ toast }) => toast.success('Shared to the feed.'))
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

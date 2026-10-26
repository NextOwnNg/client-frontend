import { ArrowLeftRight, Banknote, Flag, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/domain/Avatar'
import { Deadline } from '@/components/domain/Deadline'
import { Price } from '@/components/domain/Price'
import { ButtonLink } from '@/components/ui/Button'
import { ImageWithFade } from '@/components/ui/ImageWithFade'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SaveToggle } from '@/features/saved/components/SaveToggle'
import { conditionLabel, isAvailable, listingStatus } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { timeAgo } from '@/lib/time/time'
import type { FeedPost } from '@/types/api'

const chip = 'inline-flex h-7 items-center gap-1 rounded-full bg-mint px-2.5 text-caption font-semibold text-action'

/** A post whose listing was removed, or that moderators took down (ruling R6-2). */
function RemovedPost() {
  return (
    <article className="rounded-card border border-dashed border-border bg-surface px-4 py-5 text-center">
      <p className="text-compact font-semibold text-ink">This post is no longer available</p>
      <p className="mt-1 text-compact text-muted">It was removed, or the item it showed is no longer listed.</p>
    </article>
  )
}

/**
 * One feed highlight (FE-FED-01): the author, their caption, and the listing as it is now. Price and status
 * come from the listing, so a reserved item reads as reserved and offers no Make an offer (FE-FED-02).
 */
export function PostCard({
  post,
  now,
  viewerId,
  priority,
  onComments,
  onGuestSave,
}: {
  post: FeedPost
  now: number
  viewerId: string | null
  priority?: boolean
  onComments: (post: FeedPost) => void
  onGuestSave: (post: FeedPost) => void
}) {
  const { listing } = post
  if (!listing || post.removed) return <RemovedPost />

  const available = isAvailable(listing.status)
  const status = listingStatus(listing.status)
  const own = viewerId === post.author.id
  const titleId = `post-${post.id}-title`

  return (
    <article aria-labelledby={titleId} className="overflow-hidden rounded-card border border-border bg-surface">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar name={post.author.displayName} />
        <div className="min-w-0 flex-1">
          <Link
            to={`/users/${post.author.id}`}
            className="block truncate text-compact font-semibold text-ink underline-offset-4 hover:underline"
          >
            {post.author.displayName}
          </Link>
          <p className="truncate text-caption text-muted">
            {listing.areaName} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt, now)}</time>
          </p>
        </div>
        {!own && (
          <Link
            to={`/report/post/${post.id}`}
            aria-label={`Report ${post.author.displayName}’s post`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-120 pointer-fine:hover:bg-mint pointer-fine:hover:text-ink"
          >
            <Flag aria-hidden className="size-4.5" strokeWidth={1.75} />
          </Link>
        )}
      </header>

      {/* Captions are plain text, wrapped wherever needed */}
      <p className="px-4 pb-3 text-body break-words whitespace-pre-line text-ink">{post.caption}</p>

      <Link to={`/listings/${listing.slug}`} tabIndex={-1} aria-hidden className="relative block">
        <ImageWithFade
          src={listing.cover.url}
          alt=""
          sizes="(min-width: 768px) 600px, 100vw"
          priority={priority}
          className={cx(!available && 'opacity-60 grayscale-40')}
        />
        {!available && (
          <StatusBadge tone={status.tone} icon={status.icon} className="absolute top-3 left-3 shadow-card">
            {status.label}
          </StatusBadge>
        )}
        {available && listing.urgencyEndsAt && (
          <Deadline endsAt={listing.urgencyEndsAt} variant="compact" className="absolute top-3 left-3" />
        )}
      </Link>

      <div className="relative flex flex-col gap-1 py-3 pr-4 pl-5">
        <span aria-hidden className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-action" />
        <h3 id={titleId} className={cx('truncate text-body font-semibold', available ? 'text-ink' : 'text-muted')}>
          {listing.title}
        </h3>
        <p className="truncate text-compact text-muted">{conditionLabel(listing.condition)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {available ? (
            <Price kobo={listing.askingKobo} />
          ) : (
            <span className="text-compact font-semibold text-muted">Not accepting offers</span>
          )}
          {available && (
            <ul aria-label="Accepted offers" className="flex flex-wrap gap-1.5">
              {listing.acceptedModes.includes('CASH') && listing.askingKobo !== null && (
                <li className={chip}>
                  <Banknote aria-hidden className="size-3.5" />
                  Cash
                </li>
              )}
              {listing.acceptedModes.includes('SWAP') && (
                <li className={chip}>
                  <ArrowLeftRight aria-hidden className="size-3.5" />
                  Open to swap
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-border px-2 py-2">
        <button
          type="button"
          onClick={() => onComments(post)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-compact font-semibold text-ink transition-[background-color,transform] duration-120 ease-out active:scale-95 pointer-fine:hover:bg-mint"
        >
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          Comments
          <span className="tabular text-muted">{post.commentCount}</span>
        </button>
        <SaveToggle kind="post" id={post.id} onGuest={() => onGuestSave(post)} />
        <div className="ml-auto flex gap-2 pr-1">
          <ButtonLink to={`/listings/${listing.slug}`} variant={available && !own ? 'secondary' : 'primary'} size="sm">
            View item
          </ButtonLink>
          {available && !own && (
            <ButtonLink to={`/offers/new?listing=${listing.id}`} size="sm">
              Make an offer
            </ButtonLink>
          )}
        </div>
      </footer>
    </article>
  )
}

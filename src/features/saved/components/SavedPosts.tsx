import { Newspaper } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { PostCard } from '@/features/feed/components/PostCard'
import { useSavedIds, useSavedPosts } from '@/features/saved/api'
import { SavedSkeleton } from '@/features/saved/components/SavedSkeleton'
import { useServerNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'

/** The Posts tab: saved feed posts with their listings as they are now. Comments open on the feed. */
export function SavedPosts() {
  const { data, isPending, isError, refetch } = useSavedPosts()
  const ids = useSavedIds().data?.posts
  const userId = useSessionStore((s) => s.userId)
  const now = useServerNow()
  const navigate = useNavigate()
  const items = data?.filter((p) => !ids || ids.includes(p.id)) ?? []

  if (isPending) return <SavedSkeleton />
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

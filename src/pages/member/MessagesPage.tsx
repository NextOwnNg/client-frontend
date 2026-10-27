import { MessagesSquare } from 'lucide-react'
import { Outlet, useMatch, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useConversations } from '@/features/messages/api'
import { ConversationRow } from '@/features/messages/components/ConversationRow'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'

/**
 * UX-20: `/messages` and `/messages/:id`. Phones show the inbox or one conversation; from 1024px the inbox
 * stays on the left with the open conversation beside it, as in Offers.
 */
export function MessagesLayout() {
  const thread = useMatch('/messages/:id')
  const [params] = useSearchParams()
  // Opening from an offer or a deal counts as open, so phones show its progress instead of the inbox
  const open = Boolean(thread) || params.has('offer') || params.has('transaction')
  const now = useServerNow()
  const { data, isPending, isError, refetch } = useConversations()
  const Heading = open ? 'h2' : 'h1'

  return (
    <div className="mx-auto w-full max-w-content desktop:grid desktop:grid-cols-[22rem_minmax(0,1fr)] desktop:items-start desktop:gap-8">
      {!open && <Seo title="Messages" noindex />}
      <div className={cx('flex flex-col gap-5', open && 'hidden desktop:flex')}>
        <Heading className="text-h2 text-ink tablet:text-h1 desktop:text-h2">Messages</Heading>
        {isPending ? (
          <div aria-busy="true" aria-label="Loading your messages" className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-cloud" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="We couldn't load your messages" onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            body="Conversations start from an offer or a deal, so the terms always sit beside the chat."
            action={<ButtonLink to="/offers">Go to your offers</ButtonLink>}
          />
        ) : (
          <ul aria-label="Conversations" className="flex flex-col gap-2">
            {data.map((conv) => (
              <li key={conv.id}>
                <ConversationRow conv={conv} active={thread?.params.id === conv.id} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cx('min-w-0', !open && 'hidden desktop:block')}>
        <Outlet />
      </div>
    </div>
  )
}

import { Archive, Handshake, Inbox, MousePointerClick, Send } from 'lucide-react'
import { Link, Outlet, useMatch, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useOffers } from '@/features/offers/api'
import { OfferCard } from '@/features/offers/components/OfferCard'
import { offerTab, type OfferTab } from '@/features/offers/offer-terms'
import { cx } from '@/lib/cx'
import { useServerNow } from '@/lib/time/server-clock'
import { useSessionStore } from '@/stores/session'

const tabs: { id: OfferTab; label: string; empty: { title: string; body: string; icon: typeof Inbox } }[] = [
  {
    id: 'received',
    label: 'Received',
    empty: {
      title: 'No offers received',
      body: 'Offers on your listings arrive here. You can accept, counter or decline each one.',
      icon: Inbox,
    },
  },
  {
    id: 'sent',
    label: 'Sent',
    empty: { title: 'No offers sent', body: 'Find an item you like and make an offer from its page.', icon: Send },
  },
  {
    id: 'handover',
    label: 'Awaiting handover',
    empty: {
      title: 'Nothing awaiting handover',
      body: 'When an offer is accepted, both items are reserved here until you meet and exchange.',
      icon: Handshake,
    },
  },
  {
    id: 'closed',
    label: 'Closed',
    empty: { title: 'No closed offers', body: 'Declined, withdrawn and expired offers are kept here.', icon: Archive },
  },
]

/**
 * UX-19: `/offers` and `/offers/:id`. Phones show the inbox or one thread; from 1024px the inbox stays on the
 * left with the open thread beside it (ruling R4-7). The tab lives in the URL.
 */
export function OffersLayout() {
  const [params] = useSearchParams()
  const thread = useMatch('/offers/:id')
  const open = Boolean(thread)
  const current = tabs.find((t) => t.id === params.get('tab')) ?? tabs[0]!
  const userId = useSessionStore((s) => s.userId)
  const now = useServerNow()
  const { data, isPending, isError, refetch } = useOffers()
  const count = (tab: OfferTab) => data?.filter((o) => offerTab(o) === tab).length ?? 0
  const items = data?.filter((o) => offerTab(o) === current.id) ?? []
  const Heading = open ? 'h2' : 'h1'

  return (
    <div className="mx-auto w-full max-w-content desktop:grid desktop:grid-cols-[22rem_minmax(0,1fr)] desktop:items-start desktop:gap-8">
      {!open && <Seo title="Offers" noindex />}
      <div className={cx('flex flex-col gap-5', open && 'hidden desktop:flex')}>
        <Heading className="text-h2 text-ink tablet:text-h1 desktop:text-h2">Offers</Heading>

        <nav
          aria-label="Offer status"
          className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 tablet:mx-0 tablet:px-0"
        >
          <ul className="flex min-w-max gap-1 border-b border-border desktop:min-w-0 desktop:flex-wrap">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  to={`/offers?tab=${tab.id}`}
                  replace={!open}
                  aria-current={tab.id === current.id ? 'page' : undefined}
                  className={cx(
                    '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-compact font-semibold whitespace-nowrap transition-colors duration-120',
                    tab.id === current.id ? 'border-action text-ink' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {tab.label}
                  <span
                    className={cx(
                      'tabular rounded-full px-1.5 text-caption',
                      tab.id === current.id ? 'bg-mint text-action' : 'bg-cloud text-muted',
                    )}
                  >
                    {data ? count(tab.id) : '·'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {isPending ? (
          <div aria-busy="true" aria-label="Loading your offers" className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-card bg-cloud" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="We couldn't load your offers" onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={current.empty.icon}
            title={current.empty.title}
            body={current.empty.body}
            action={current.id === 'sent' ? <ButtonLink to="/explore">Explore items</ButtonLink> : undefined}
          />
        ) : (
          <ul aria-label={`${current.label} offers`} className="flex flex-col gap-2">
            {items.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                viewerId={userId ?? ''}
                now={now}
                href={`/offers/${offer.id}?tab=${current.id}`}
                current={thread?.params.id === offer.id}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={cx(!open && 'hidden desktop:block')}>
        <Outlet />
      </div>
    </div>
  )
}

/** The right-hand pane on desktop before an offer is chosen. */
export function OffersIndex() {
  return (
    <div className="hidden min-h-96 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border p-8 text-center desktop:flex">
      <MousePointerClick aria-hidden className="size-6 text-muted" />
      <p className="max-w-xs text-body text-muted">
        Choose an offer to see its terms, its history and what you can do next.
      </p>
    </div>
  )
}

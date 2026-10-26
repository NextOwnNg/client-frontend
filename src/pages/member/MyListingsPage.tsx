import { Archive, Clock, Handshake, PackageOpen, PencilLine, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useRuntimeConfig } from '@/features/config/api'
import { useMyListings } from '@/features/selling/api'
import { OwnListingRow } from '@/features/selling/components/OwnListingRow'
import { tabOf, type ListingTab } from '@/features/selling/listing-input'
import { cx } from '@/lib/cx'

const tabs: { id: ListingTab; label: string; empty: { title: string; body: string; icon: typeof Plus } }[] = [
  {
    id: 'draft',
    label: 'Draft',
    empty: { title: 'No drafts', body: 'Listings you start but haven’t published are kept here.', icon: PencilLine },
  },
  {
    id: 'active',
    label: 'Active',
    empty: { title: 'Nothing listed right now', body: 'Publish a listing and it shows up here.', icon: PackageOpen },
  },
  {
    id: 'reserved',
    label: 'Reserved',
    empty: {
      title: 'No reserved items',
      body: 'When you accept an offer, the item is reserved here until the exchange.',
      icon: Handshake,
    },
  },
  {
    id: 'expired',
    label: 'Expired',
    empty: {
      title: 'No expired listings',
      body: 'Listings that reach their Quick Sell deadline show up here, ready to renew, edit or close.',
      icon: Clock,
    },
  },
  {
    id: 'closed',
    label: 'Closed',
    empty: {
      title: 'No closed listings',
      body: 'Listings you close or complete are kept here for your records.',
      icon: Archive,
    },
  },
]

/** UX-13 / FE-LST-08: the owner's listings by state, with the tab in the URL. */
export function MyListingsPage() {
  const [params] = useSearchParams()
  const current = tabs.find((t) => t.id === params.get('tab')) ?? tabs[1]!
  const { data, isPending, isError, refetch } = useMyListings()
  const { data: config } = useRuntimeConfig()
  const count = (tab: ListingTab) => data?.filter((l) => tabOf(l.status) === tab).length ?? 0
  const items = data?.filter((l) => tabOf(l.status) === current.id) ?? []

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Seo title="My listings" noindex />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 text-ink tablet:text-h1">My listings</h1>
        <ButtonLink to="/listings/new" size="sm" className="shrink-0">
          <Plus aria-hidden className="size-4" />
          List an item
        </ButtonLink>
      </div>

      <nav
        aria-label="Listing status"
        className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 tablet:mx-0 tablet:px-0"
      >
        <ul className="flex min-w-max gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <Link
                to={`?tab=${tab.id}`}
                replace
                aria-current={tab.id === current.id ? 'page' : undefined}
                className={cx(
                  '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-compact font-semibold transition-colors duration-120',
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
        <div aria-busy="true" aria-label="Loading your listings" className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-card bg-cloud" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load your listings" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={current.empty.icon}
          title={current.empty.title}
          body={current.empty.body}
          action={
            current.id === 'draft' || current.id === 'active' ? (
              <ButtonLink to="/listings/new">List an item</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul aria-label={`${current.label} listings`} className="flex flex-col gap-3">
          {items.map((listing) => (
            <OwnListingRow key={listing.id} listing={listing} quickSellOptions={config?.quickSellOptionsHours ?? []} />
          ))}
        </ul>
      )}
    </div>
  )
}

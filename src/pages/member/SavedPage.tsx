import { Link, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { SavedListings } from '@/features/saved/components/SavedListings'
import { SavedPosts } from '@/features/saved/components/SavedPosts'
import { cx } from '@/lib/cx'

type Tab = 'listings' | 'posts'
const tabs: { id: Tab; label: string }[] = [
  { id: 'listings', label: 'Listings' },
  { id: 'posts', label: 'Posts' },
]

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

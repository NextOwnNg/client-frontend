import { Link } from 'react-router'
import { useRuntimeConfig } from '@/features/config/api'

/** Desktop side rail on the feed: one tap to Explore, filtered to a category. */
export function CategoryRail() {
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

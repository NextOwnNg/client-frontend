import { Gamepad2, Laptop, Refrigerator, Shapes, Smartphone, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { Category } from '@/types/api'

const categoryIcons: Record<string, LucideIcon> = {
  phones: Smartphone,
  laptops: Laptop,
  gaming: Gamepad2,
  home: Refrigerator,
}

export function CategoryShortcuts({ categories }: { categories: Category[] }) {
  return (
    <nav aria-label="Browse by category" className="flex flex-col gap-3">
      <h2 className="text-h3 text-ink tablet:text-h2">Browse by category</h2>
      <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4 tablet:gap-3">
        {categories.map((c) => {
          const Icon = categoryIcons[c.id] ?? Shapes
          return (
            <li key={c.id}>
              <Link
                to={`/explore?category=${encodeURIComponent(c.id)}`}
                className="flex min-h-14 items-center gap-3 rounded-control border border-border bg-surface px-3 text-compact font-semibold text-ink transition-[border-color,transform] duration-120 ease-out outline-none focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.97] pointer-fine:hover:border-action/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint text-action">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0">{c.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

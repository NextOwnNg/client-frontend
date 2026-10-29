import { BookOpen, LifeBuoy, PackageX } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '@/lib/cx'

const links = [
  { to: '/community-rules', label: 'Community rules', icon: BookOpen },
  { to: '/community-rules#prohibited', label: 'Prohibited items', icon: PackageX },
  { to: '/support', label: 'Safety guide', icon: LifeBuoy },
]

/** FE-TRU-05: the rules, in context, wherever someone publishes, offers, hands over or reports. */
export function PolicyLinks({ className }: { className?: string }) {
  return (
    <ul aria-label="Rules and safety" className={cx('flex flex-wrap gap-x-5', className)}>
      {links.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <Link
            to={to}
            className="inline-flex min-h-11 items-center gap-1.5 text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

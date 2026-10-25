import { cx } from '@/lib/cx'

const sizes = {
  md: 'size-10 text-body',
  lg: 'size-16 text-h3',
} as const

/** Initials on Mint until profile photos arrive with the photo uploader. Decorative: the name is always shown beside it. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: keyof typeof sizes
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-mint font-bold text-action',
        sizes[size],
        className,
      )}
    >
      {initials || '?'}
    </span>
  )
}

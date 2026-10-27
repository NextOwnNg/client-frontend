import { useState } from 'react'
import { cx } from '@/lib/cx'

const sizes = {
  md: 'size-10 text-body',
  lg: 'size-16 text-h3',
} as const

/**
 * The person's photo, or their initials on Mint when there's none or it fails to load (ruling R7-7).
 * Decorative: the name is always shown beside it.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string
  size?: keyof typeof sizes
  className?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
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
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint font-bold text-action',
        sizes[size],
        className,
      )}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          className="size-full object-cover"
        />
      ) : (
        initials || '?'
      )}
    </span>
  )
}

import { cx } from '@/lib/cx'
import { formatNaira } from '@/lib/money/money'

/** Asking price in tabular figures; swap-only listings say so instead of showing ₦0. */
export function Price({ kobo, size = 'md', className }: { kobo: number | null; size?: 'md' | 'lg'; className?: string }) {
  if (kobo === null) {
    return <span className={cx('font-semibold text-ink', size === 'lg' ? 'text-h3' : 'text-body', className)}>Open to swap</span>
  }
  return (
    <span className={cx('tabular font-bold text-ink', size === 'lg' ? 'text-price' : 'text-[1.125rem] leading-6', className)}>
      {formatNaira(kobo)}
    </span>
  )
}

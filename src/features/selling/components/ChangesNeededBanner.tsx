import { Link } from 'react-router'
import { Banner } from '@/components/ui/Banner'
import { reviewCopy } from '@/features/selling/copy'

export function ChangesNeededBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Banner
      tone="warning"
      role="status"
      title={reviewCopy.banner(count)}
      action={
        <Link
          to="/me/listings?tab=draft"
          className="inline-flex min-h-11 items-center text-compact font-semibold text-action underline-offset-4 hover:underline"
        >
          {reviewCopy.bannerLink(count)}
        </Link>
      }
    />
  )
}

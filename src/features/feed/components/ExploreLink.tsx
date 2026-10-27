import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

/** FE-FED-04: the way to the full marketplace, at the top of the feed and in its empty state. */
export function ExploreLink({ className }: { className?: string }) {
  return (
    <ButtonLink to="/explore" variant="secondary" className={className}>
      <Compass aria-hidden className="size-5" />
      Explore marketplace
    </ButtonLink>
  )
}

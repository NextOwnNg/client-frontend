import { ButtonLink } from '@/components/ui/Button'

export function HeroActions() {
  return (
    <div className="grid grid-cols-2 gap-3 tablet:flex">
      <ButtonLink to="/explore" className="w-full tablet:w-auto">
        Explore items
      </ButtonLink>
      <ButtonLink to="/listings/new" variant="secondary" className="w-full tablet:w-auto">
        List an item
      </ButtonLink>
    </div>
  )
}

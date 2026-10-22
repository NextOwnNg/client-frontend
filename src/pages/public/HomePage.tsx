import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { copy } from '@/lib/copy/copy'

/** Placeholder home until Phase 1 builds the real one (UX-01). */
export function HomePage() {
  return (
    <>
      <Seo description={copy.supportingLine} />
      <section className="flex max-w-2xl flex-col gap-4 py-8 desktop:py-16">
        <h1 className="text-h1 text-ink desktop:text-display">{copy.hero}</h1>
        <p className="text-body text-muted">{copy.supportingLine}</p>
        <div className="flex flex-col gap-3 tablet:flex-row">
          <ButtonLink to="/explore" variant="primary">
            Explore items
          </ButtonLink>
          <ButtonLink to="/listings/new" variant="secondary">
            List an item
          </ButtonLink>
        </div>
      </section>
    </>
  )
}

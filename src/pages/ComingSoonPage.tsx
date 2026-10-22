import { Hammer } from 'lucide-react'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

/** Placeholder so navigation works while later phases are built. */
export function ComingSoonPage({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <Seo title={title} noindex />
      <EmptyState
        icon={Hammer}
        title={title}
        body={`This screen arrives in ${phase}.`}
        action={
          <ButtonLink to="/dev/components" variant="secondary">
            See the component gallery
          </ButtonLink>
        }
      />
    </>
  )
}

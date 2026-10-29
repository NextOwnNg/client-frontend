import { PolicyPage } from '@/features/help/components/PolicyPage'
import { termsDoc } from '@/features/help/content/terms'

/** `/terms`: the pilot terms summary. */
export function TermsPage() {
  return <PolicyPage doc={termsDoc} path="/terms" />
}

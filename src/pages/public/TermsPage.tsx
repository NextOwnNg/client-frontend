import { PolicyPage } from '@/features/help/components/PolicyPage'
import { termsDoc } from '@/features/help/content/terms'

export function TermsPage() {
  return <PolicyPage doc={termsDoc} path="/terms" />
}

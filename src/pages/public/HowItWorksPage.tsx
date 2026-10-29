import { PolicyPage } from '@/features/help/components/PolicyPage'
import { howItWorksDoc } from '@/features/help/content/how-it-works'

/** `/how-it-works`: how a trade works, end to end. */
export function HowItWorksPage() {
  return <PolicyPage doc={howItWorksDoc} path="/how-it-works" />
}

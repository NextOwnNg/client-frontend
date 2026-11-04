import { PolicyPage } from '@/features/help/components/PolicyPage'
import { howItWorksDoc } from '@/features/help/content/how-it-works'

export function HowItWorksPage() {
  return <PolicyPage doc={howItWorksDoc} path="/how-it-works" />
}

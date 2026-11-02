import { PolicyPage } from '@/features/help/components/PolicyPage'
import { privacyDoc } from '@/features/help/content/privacy'

export function PrivacyPage() {
  return <PolicyPage doc={privacyDoc} path="/privacy" />
}

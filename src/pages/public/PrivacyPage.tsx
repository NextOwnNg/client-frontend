import { PolicyPage } from '@/features/help/components/PolicyPage'
import { privacyDoc } from '@/features/help/content/privacy'

/** `/privacy`: the pilot privacy summary. */
export function PrivacyPage() {
  return <PolicyPage doc={privacyDoc} path="/privacy" />
}

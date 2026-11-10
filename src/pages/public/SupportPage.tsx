import { ProfileBackLink } from '@/features/account/components/ProfileBackLink'
import { PolicyPage } from '@/features/help/components/PolicyPage'
import { supportDoc } from '@/features/help/content/support'

export function SupportPage() {
  return <PolicyPage doc={supportDoc} path="/support" back={<ProfileBackLink onlyFromProfile className="-mb-1" />} />
}

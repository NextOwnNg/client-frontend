import { PolicyPage } from '@/features/help/components/PolicyPage'
import { supportDoc } from '@/features/help/content/support'

/** `/support`: the safety guide. */
export function SupportPage() {
  return <PolicyPage doc={supportDoc} path="/support" />
}

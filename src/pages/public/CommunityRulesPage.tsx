import { PolicyPage } from '@/features/help/components/PolicyPage'
import { communityRulesDoc } from '@/features/help/content/community-rules'

/** `/community-rules`: the community rules and prohibited items (TRU-05). */
export function CommunityRulesPage() {
  return <PolicyPage doc={communityRulesDoc} path="/community-rules" />
}

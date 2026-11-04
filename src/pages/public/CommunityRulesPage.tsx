import { PolicyPage } from '@/features/help/components/PolicyPage'
import { communityRulesDoc } from '@/features/help/content/community-rules'

export function CommunityRulesPage() {
  return <PolicyPage doc={communityRulesDoc} path="/community-rules" />
}

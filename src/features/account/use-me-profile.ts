import { useMe } from '@/features/account/api'
import { useRuntimeConfig } from '@/features/config/api'
import type { PublicProfile } from '@/types/api'

/** The member as others see them, for the hub's profile card. A signed-in member has always confirmed their phone. */
export function useMeProfile(): PublicProfile | undefined {
  const { data: me } = useMe()
  const { data: config } = useRuntimeConfig()
  if (!me) return undefined
  return {
    id: me.id,
    displayName: me.displayName ?? 'New member',
    avatarUrl: me.avatarUrl,
    areaName: config?.areas.find((a) => a.id === me.areaId)?.name ?? config?.cityName ?? 'Pilot city',
    phoneConfirmed: true,
    reviewCount: me.reviewCount,
    rating: me.rating,
    memberSince: me.memberSince,
  }
}

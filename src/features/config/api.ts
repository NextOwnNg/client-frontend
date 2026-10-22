import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { RuntimeConfig } from '@/types/api'

export const configQueryKey = ['config'] as const

/** Pilot settings (areas, categories, limits) come from the API, never hard-coded (PRD §4.7). */
export function useRuntimeConfig() {
  return useQuery({
    queryKey: configQueryKey,
    queryFn: ({ signal }) => apiClient.get<RuntimeConfig>('/config', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

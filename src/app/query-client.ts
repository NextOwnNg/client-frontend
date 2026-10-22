import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api/api-error'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Retry safe reads on network/5xx only; never retry 4xx (PRD §4.4)
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status !== undefined && error.status < 500) return false
          return failureCount < 2
        },
      },
      mutations: {
        // Writes are never auto-retried; uncertain outcomes use read-before-retry (PRD §7.4)
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()

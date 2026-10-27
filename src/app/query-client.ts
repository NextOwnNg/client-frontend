import { QueryClient } from '@tanstack/react-query'
import { isRetryable } from '@/lib/api/error-checks'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Retry safe reads on network/5xx only; never retry 4xx (PRD §4.4)
        retry: (failureCount, error) => {
          if (!isRetryable(error)) return false
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

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useSessionStore } from '@/stores/session'
import type { AppNotification, NotificationCounts } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  counts: ['notifications', 'counts'] as const,
}

const POLL_MS = 30_000

/** Unread alerts and messages for the header badges; polled while the tab is visible (FE-NTF-01). */
export function useNotificationCounts() {
  const member = useSessionStore((s) => s.status === 'member')
  return useQuery({
    queryKey: notificationKeys.counts,
    queryFn: ({ signal }) => apiClient.get<NotificationCounts>('/notifications/counts', { signal }).then((r) => r.data),
    enabled: member,
    refetchInterval: POLL_MS,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ signal }) => apiClient.get<AppNotification[]>('/notifications', { signal }).then((r) => r.data),
    refetchInterval: POLL_MS,
  })
}

/** The cached data a notification's page shows, so opening it always reads where things stand now. */
const targets: [prefix: string, key: string][] = [
  ['/offers', 'offers'],
  ['/transactions', 'transactions'],
  ['/feed', 'feed'],
  ['/listings', 'listings'],
  ['/messages', 'conversations'],
]

/** Marks it read and drops its target's cache before the link is followed (FE-NTF-01, ruling R6-8). */
export function openNotification(queryClient: QueryClient, notification: AppNotification) {
  const target = targets.find(([prefix]) => notification.link.startsWith(prefix))
  if (target) void queryClient.invalidateQueries({ queryKey: [target[1]] })
  if (notification.read) return
  queryClient.setQueryData<AppNotification[]>(notificationKeys.list, (list) =>
    list?.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
  )
  void apiClient
    .post(`/notifications/${notification.id}/read`)
    .finally(() => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }))
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

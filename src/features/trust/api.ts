import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meKey } from '@/features/account/api'
import { apiClient } from '@/lib/api/client'
import { useSessionStore } from '@/stores/session'
import type { Appeal, BlockedPerson, Me, CaseReport, NewReport, ReportReceipt, ReportTarget } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const trustKeys = {
  all: ['trust'] as const,
  target: (type: string, id: string) => ['trust', 'target', type, id] as const,
  reports: ['trust', 'reports'] as const,
  blocks: ['trust', 'blocks'] as const,
}

/** What a report page is about (FE-TRU-01). A removed or private target comes back as 404. */
export function useReportTarget(type: string, id: string) {
  return useQuery({
    queryKey: trustKeys.target(type, id),
    queryFn: ({ signal }) =>
      apiClient.get<ReportTarget>(`/reports/target/${type}/${id}`, { signal }).then((r) => r.data),
    retry: false,
  })
}

export function useSendReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (report: NewReport) => apiClient.post<ReportReceipt>('/reports', report).then((r) => r.data),
    onSuccess: (_receipt, report) => {
      void queryClient.invalidateQueries({ queryKey: trustKeys.reports })
      if (report.alsoBlock) invalidateBlocked(queryClient)
    },
  })
}

/** FE-TRU-03: the member's own cases, status only. */
export function useMyReports() {
  return useQuery({
    queryKey: trustKeys.reports,
    queryFn: ({ signal }) => apiClient.get<CaseReport[]>('/me/reports', { signal }).then((r) => r.data),
  })
}

export function useBlockedPeople() {
  const member = useSessionStore((s) => s.status === 'member')
  return useQuery({
    queryKey: trustKeys.blocks,
    queryFn: ({ signal }) => apiClient.get<BlockedPerson[]>('/me/blocks', { signal }).then((r) => r.data),
    enabled: member,
  })
}

export function useIsBlocked(userId: string) {
  return useBlockedPeople().data?.some((p) => p.id === userId) ?? false
}

/** Blocking changes chats, offers, the feed and listing pages, so each refetches (ruling R7-4). */
function invalidateBlocked(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of [trustKeys.blocks, ['conversations'], ['feed'], ['listings'], ['offers']]) {
    void queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useSetBlocked() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, blocked }: { userId: string; blocked: boolean }) =>
      blocked ? apiClient.put(`/me/blocks/${userId}`) : apiClient.delete(`/me/blocks/${userId}`),
    onSuccess: () => invalidateBlocked(queryClient),
  })
}

/** Ruling R7-5: a restricted member asks for a review; `/me` then carries the appeal. */
export function useSendAppeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => apiClient.post<Appeal>('/me/appeal', { message }).then((r) => r.data),
    // Shown at once; the refetch confirms it (and picks up an appeal made elsewhere after a 409)
    onSuccess: (appeal) => queryClient.setQueryData<Me | null>(meKey, (me) => me && { ...me, appeal }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: meKey }),
  })
}

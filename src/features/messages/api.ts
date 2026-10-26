import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { ChatMessage, Conversation, ConversationDetail } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const conversationKeys = {
  all: ['conversations'] as const,
  list: ['conversations', 'list'] as const,
  one: (id: string) => ['conversations', 'one', id] as const,
}

/** FE-MSG-05: the inbox every 30 s and an open thread every 5 s; both pause while the tab is hidden. */
export const INBOX_POLL_MS = 30_000
export const THREAD_POLL_MS = 5_000

export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.list,
    queryFn: ({ signal }) => apiClient.get<Conversation[]>('/conversations', { signal }).then((r) => r.data),
    refetchInterval: INBOX_POLL_MS,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.one(id),
    queryFn: ({ signal }) => apiClient.get<ConversationDetail>(`/conversations/${id}`, { signal }).then((r) => r.data),
    refetchInterval: THREAD_POLL_MS,
    refetchOnWindowFocus: 'always',
    // A failed poll keeps the thread on screen and shows "Reconnecting…" (ruling R6-7)
    retry: false,
  })
}

/** Finds or starts the conversation for an offer or a deal (ruling R6-5). */
export function useOpenConversation() {
  return useMutation({
    mutationFn: (about: { offerId: string } | { transactionId: string }) =>
      apiClient.post<{ id: string }>('/conversations', about).then((r) => r.data.id),
  })
}

export function useMarkConversationRead(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post(`/conversations/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.list })
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'counts'] })
    },
  })
}

export const postMessage = (conversationId: string, clientId: string, body: string) =>
  apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, { clientId, body }).then((r) => r.data)

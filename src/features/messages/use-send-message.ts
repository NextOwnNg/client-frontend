import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { conversationKeys, postMessage } from '@/features/messages/api'
import { isRefused } from '@/lib/api/error-checks'
import type { ConversationDetail } from '@/types/api'

/** A message on screen before the server has it: "Sending…", or "Not sent" with Retry. */
export type PendingMessage = { clientId: string; body: string; status: 'sending' | 'failed'; createdAt: string }

/**
 * Sends with a client message id chosen once per message (FE-MSG-02). A retry reuses it, so a message the
 * server stored before its answer was lost still appears exactly once.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingMessage[]>([])

  const mark = (clientId: string, status: PendingMessage['status']) =>
    setPending((list) => list.map((m) => (m.clientId === clientId ? { ...m, status } : m)))

  async function deliver(clientId: string, body: string) {
    mark(clientId, 'sending')
    try {
      const message = await postMessage(conversationId, clientId, body)
      queryClient.setQueryData<ConversationDetail>(conversationKeys.one(conversationId), (thread) =>
        thread && !thread.messages.some((m) => m.id === message.id)
          ? { ...thread, messages: [...thread.messages, message] }
          : thread,
      )
      setPending((list) => list.filter((m) => m.clientId !== clientId))
      void queryClient.invalidateQueries({ queryKey: conversationKeys.list })
    } catch (error) {
      mark(clientId, 'failed')
      // Blocked meanwhile: reload the thread so the composer gives way to the notice
      if (isRefused(error)) {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.one(conversationId) })
      }
    }
  }

  return {
    pending,
    send: (body: string) => {
      const clientId = crypto.randomUUID()
      setPending((list) => [...list, { clientId, body, status: 'sending', createdAt: new Date().toISOString() }])
      void deliver(clientId, body)
    },
    retry: (clientId: string) => {
      const message = pending.find((m) => m.clientId === clientId)
      if (message) void deliver(clientId, message.body)
    },
    discard: (clientId: string) => setPending((list) => list.filter((m) => m.clientId !== clientId)),
  }
}

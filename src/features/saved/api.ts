import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useSessionStore } from '@/stores/session'
import type { FeedPost, ListingSummary, SavedIds, SavedKind } from '@/types/api'

/** Member data: signing out removes these with everything else that isn't public. */
export const savedKeys = {
  all: ['saved'] as const,
  ids: ['saved', 'ids'] as const,
  listings: ['saved', 'listings'] as const,
  posts: ['saved', 'posts'] as const,
}

const bucket = (kind: SavedKind) => (kind === 'listing' ? 'listings' : 'posts')

/** What the member has saved, for every Save toggle on screen. Guests have nothing saved. */
export function useSavedIds() {
  const member = useSessionStore((s) => s.status === 'member')
  return useQuery({
    queryKey: savedKeys.ids,
    queryFn: ({ signal }) => apiClient.get<SavedIds>('/saved/ids', { signal }).then((r) => r.data),
    enabled: member,
  })
}

export function useIsSaved(kind: SavedKind, id: string) {
  return useSavedIds().data?.[bucket(kind)].includes(id) ?? false
}

type Toggle = { kind: SavedKind; id: string; on: boolean }

/**
 * Save or unsave at once, then confirm with the server (FE-SAV-01). If the server says no, the toggle goes
 * back to what it was and the member is told.
 */
export function useToggleSave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, id, on }: Toggle) =>
      (on ? apiClient.put<SavedIds>(`/saved/${kind}/${id}`) : apiClient.delete<SavedIds>(`/saved/${kind}/${id}`)).then(
        (r) => r.data,
      ),
    onMutate: async ({ kind, id, on }) => {
      await queryClient.cancelQueries({ queryKey: savedKeys.ids })
      const before = queryClient.getQueryData<SavedIds>(savedKeys.ids)
      const current = before ?? { listings: [], posts: [] }
      const rest = current[bucket(kind)].filter((x) => x !== id)
      queryClient.setQueryData<SavedIds>(savedKeys.ids, { ...current, [bucket(kind)]: on ? [id, ...rest] : rest })
      return { before }
    },
    onError: (_error, { on }, context) => {
      queryClient.setQueryData(savedKeys.ids, context?.before)
      // Loaded on demand, so the listing page doesn't pay for the toast up front
      void import('@heroui/react').then(({ toast }) =>
        toast(on ? 'We couldn’t save that. Try again.' : 'We couldn’t remove that. Try again.'),
      )
    },
    onSuccess: (ids) => queryClient.setQueryData(savedKeys.ids, ids),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: savedKeys.listings })
      void queryClient.invalidateQueries({ queryKey: savedKeys.posts })
    },
  })
}

export function useSavedListings() {
  return useQuery({
    queryKey: savedKeys.listings,
    queryFn: ({ signal }) => apiClient.get<ListingSummary[]>('/saved/listings', { signal }).then((r) => r.data),
  })
}

export function useSavedPosts() {
  return useQuery({
    queryKey: savedKeys.posts,
    queryFn: ({ signal }) => apiClient.get<FeedPost[]>('/saved/posts', { signal }).then((r) => r.data),
  })
}

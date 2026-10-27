import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { FeedComment, FeedPost, Paginated } from '@/types/api'

export const feedKeys = {
  all: ['feed'] as const,
  list: ['feed', 'list'] as const,
  post: (id: string) => ['feed', 'post', id] as const,
  comments: (id: string) => ['feed', 'comments', id] as const,
}

/**
 * The feed, a page at a time (FE-FED-05). Pages are joined here and a post that slipped into a later page
 * (because something new was posted meanwhile) is shown once.
 */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.list,
    queryFn: ({ pageParam, signal }) =>
      apiClient
        .get<Paginated<FeedPost>>('/feed', { params: { cursor: pageParam ?? undefined }, signal })
        .then((r) => r.data),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => {
      const seen = new Set<string>()
      return data.pages.flatMap((page) =>
        page.items.filter((post) => (seen.has(post.id) ? false : (seen.add(post.id), true))),
      )
    },
  })
}

/** One post, for a link from a notification (`/feed?post=`). */
export function usePost(id: string | null) {
  return useQuery({
    queryKey: feedKeys.post(id ?? ''),
    queryFn: ({ signal }) => apiClient.get<FeedPost>(`/feed/${id}`, { signal }).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: ({ signal }) => apiClient.get<FeedComment[]>(`/feed/${postId}/comments`, { signal }).then((r) => r.data),
    enabled,
  })
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => apiClient.post<FeedComment>(`/feed/${postId}/comments`, { body }).then((r) => r.data),
    onSuccess: (comment) => {
      queryClient.setQueryData<FeedComment[]>(feedKeys.comments(postId), (list) => [comment, ...(list ?? [])])
      // The card's comment count
      void queryClient.invalidateQueries({ queryKey: feedKeys.list })
    },
  })
}

export function useSharePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { listingId: string; caption: string }) =>
      apiClient.post<FeedPost>('/feed', input).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKeys.list }),
  })
}

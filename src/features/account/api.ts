import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { applyMe } from '@/stores/session'
import type { ListingSummary, Me, MeUpdate, Paginated, PublicProfile } from '@/types/api'

export const meKey = ['me'] as const

/** Who is signed in. The session is an HttpOnly cookie (FE-D-03), so the API is the only source; a guest is `null`. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: ({ signal }) =>
      apiClient
        .get<Me>('/me', { signal })
        .then((r) => r.data)
        .catch((error: unknown) => {
          if (isApiError(error) && error.status === 401) return null
          throw error
        }),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export const accountKeys = {
  profile: (id: string) => ['users', id] as const,
  listings: (id: string) => ['users', id, 'listings'] as const,
}

export function useRequestCode() {
  return useMutation({
    mutationFn: (phone: string) =>
      apiClient.post<{ resendAfterSeconds: number }>('/auth/otp/request', { phone }).then((r) => r.data),
  })
}

export function useVerifyCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { phone: string; code: string }) =>
      apiClient.post<{ user: Me; isNew: boolean }>('/auth/otp/verify', body).then((r) => r.data),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(meKey, user)
      // Synchronously, so the very next route (onboarding or `next`) already sees a member
      applyMe(user)
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: MeUpdate) => apiClient.patch<Me>('/me', changes).then((r) => r.data),
    onSuccess: (me) => {
      queryClient.setQueryData(meKey, me)
      applyMe(me)
    },
  })
}

/** Signs out and goes home first, so a member-only page never flashes its sign-in redirect. */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => {
      void navigate('/', { replace: true })
      forgetMember(queryClient)
    },
  })
}

export function useDeleteRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ reference: string; requestedAt: string }>('/me/delete-request').then((r) => r.data),
    onSuccess: ({ requestedAt }) =>
      queryClient.setQueryData<Me | null>(meKey, (me) => (me ? { ...me, deletionRequestedAt: requestedAt } : me)),
  })
}

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: accountKeys.profile(id),
    queryFn: ({ signal }) => apiClient.get<PublicProfile>(`/users/${id}`, { signal }).then((r) => r.data),
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2,
  })
}

export function useUserListings(id: string) {
  return useQuery({
    queryKey: accountKeys.listings(id),
    queryFn: ({ signal }) =>
      apiClient.get<Paginated<ListingSummary>>(`/users/${id}/listings`, { signal }).then((r) => r.data),
  })
}

/** Signs the client out: the session store, and every cached query that belonged to the member. */
export function forgetMember(queryClient: QueryClient) {
  // Public data (listings, config, public profiles) stays cached
  queryClient.removeQueries({
    predicate: (q) => !['listings', 'config', 'users', 'me'].includes(q.queryKey[0] as string),
  })
  queryClient.setQueryData(meKey, null)
  applyMe(null)
}

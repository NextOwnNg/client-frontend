import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { isNotFound, isSignedOut } from '@/lib/api/error-checks'
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
          if (isSignedOut(error)) return null
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

/** A code was emailed; another can be asked for after this many seconds. */
export type CodeSent = { resendAfterSeconds: number }

/** Signed in: the cookie is set, so the member goes into the cache and the session store straight away. */
function useSignedIn() {
  const queryClient = useQueryClient()
  return (user: Me) => {
    queryClient.setQueryData(meKey, user)
    // Synchronously, so the very next route (onboarding or `next`) already sees a member
    applyMe(user)
  }
}

export function useSignIn() {
  const signedIn = useSignedIn()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiClient.post<{ user: Me }>('/auth/login', body).then((r) => r.data),
    onSuccess: ({ user }) => signedIn(user),
  })
}

/** Starts an account: the server emails a code, and the account exists once the code is confirmed. */
export function useSignUp() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiClient.post<CodeSent>('/auth/signup', body).then((r) => r.data),
  })
}

/** Emails a new sign-up code, for "Send a new code" and for an unconfirmed email trying to sign in. */
export function useResendEmailCode() {
  return useMutation({
    mutationFn: (email: string) => apiClient.post<CodeSent>('/auth/email/resend', { email }).then((r) => r.data),
  })
}

export function useVerifyEmail() {
  const signedIn = useSignedIn()
  return useMutation({
    mutationFn: (body: { email: string; code: string }) =>
      apiClient.post<{ user: Me; isNew: boolean }>('/auth/email/verify', body).then((r) => r.data),
    onSuccess: ({ user }) => signedIn(user),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => apiClient.post<CodeSent>('/auth/password/forgot', { email }).then((r) => r.data),
  })
}

/** Sets a new password with the emailed code, and signs the person in. */
export function useResetPassword() {
  const signedIn = useSignedIn()
  return useMutation({
    mutationFn: (body: { email: string; code: string; password: string }) =>
      apiClient.post<{ user: Me }>('/auth/password/reset', body).then((r) => r.data),
    onSuccess: ({ user }) => signedIn(user),
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
    retry: (count, error) => !isNotFound(error) && count < 2,
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

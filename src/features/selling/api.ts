import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listingKeys } from '@/features/listings/api'
import { apiClient } from '@/lib/api/client'
import type { ListingInput, MediaRef, OwnListing } from '@/types/api'

/** The member's own listings. Not under `me`, so signing out clears them with the rest of the member's data. */
export const ownListingKeys = {
  all: ['own-listings'] as const,
  one: (id: string) => ['own-listings', id] as const,
}

export function useMyListings() {
  return useQuery({
    queryKey: ownListingKeys.all,
    queryFn: ({ signal }) => apiClient.get<OwnListing[]>('/me/listings', { signal }).then((r) => r.data),
  })
}

export function useOwnListing(id: string | undefined) {
  return useQuery({
    queryKey: ownListingKeys.one(id ?? 'new'),
    queryFn: ({ signal }) => apiClient.get<OwnListing>(`/me/listings/${id}`, { signal }).then((r) => r.data),
    enabled: Boolean(id),
    // The wizard owns the form while it's open; don't overwrite it from a background refetch
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/** After any change, the owner's lists and the public listing pages are out of date. */
function useSettle() {
  const queryClient = useQueryClient()
  return (listing?: OwnListing) => {
    if (listing) queryClient.setQueryData(ownListingKeys.one(listing.id), listing)
    void queryClient.invalidateQueries({ queryKey: ownListingKeys.all, exact: true })
    void queryClient.invalidateQueries({ queryKey: listingKeys.all })
  }
}

export function useCreateListing() {
  const settle = useSettle()
  return useMutation({
    mutationFn: (input: Partial<ListingInput>) => apiClient.post<OwnListing>('/listings', input).then((r) => r.data),
    onSuccess: settle,
  })
}

export function useSaveListing() {
  const settle = useSettle()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ListingInput> }) =>
      apiClient.patch<OwnListing>(`/listings/${id}`, input).then((r) => r.data),
    onSuccess: settle,
  })
}

export function useListingAction() {
  const settle = useSettle()
  return useMutation({
    mutationFn: ({
      id,
      action,
      quickSellHours,
    }: {
      id: string
      action: 'publish' | 'close' | 'renew'
      quickSellHours?: number | null
    }) =>
      apiClient
        .post<OwnListing>(`/listings/${id}/${action}`, action === 'renew' ? { quickSellHours } : undefined)
        .then((r) => r.data),
    onSuccess: settle,
  })
}

export function useDiscardDraft() {
  const settle = useSettle()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/listings/${id}`),
    onSuccess: () => settle(),
  })
}

/** Uploads one prepared photo with progress (PRD §4.4). The real API will hand out a signed upload URL. */
export function uploadPhoto(
  photo: { blob: Blob; width?: number; height?: number; alt: string },
  { onProgress, signal }: { onProgress: (fraction: number) => void; signal: AbortSignal },
) {
  const form = new FormData()
  form.append('file', photo.blob, 'photo.jpg')
  form.append('alt', photo.alt)
  if (photo.width) form.append('width', String(photo.width))
  if (photo.height) form.append('height', String(photo.height))
  return apiClient
    .post<MediaRef>('/media', form, {
      signal,
      timeout: 60_000,
      onUploadProgress: (e) => e.total && onProgress(e.loaded / e.total),
    })
    .then((r) => r.data)
}

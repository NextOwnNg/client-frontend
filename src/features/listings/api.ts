import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { savesData } from '@/lib/network/save-data'
import { toApiParams, type ListingFilters } from '@/features/listings/filters'
import type { ListingDetail, ListingSuggestion, ListingSummary, Paginated } from '@/types/api'

export const listingKeys = {
  all: ['listings'] as const,
  lists: () => [...listingKeys.all, 'list'] as const,
  list: (filters: ListingFilters) => [...listingKeys.lists(), filters] as const,
  detail: (slug: string) => [...listingKeys.all, 'detail', slug] as const,
  suggest: (q: string) => [...listingKeys.all, 'suggest', q] as const,
}

type ListPages = InfiniteData<Paginated<ListingSummary>, string | null>

export function useListings(filters: ListingFilters, { enabled = true }: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: listingKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      apiClient
        .get<Paginated<ListingSummary>>('/listings', {
          params: { ...toApiParams(filters), cursor: pageParam ?? undefined },
          signal,
        })
        .then((r) => r.data),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Keep the old results on screen while a changed filter loads, so the grid doesn't flash empty
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Any card already on screen for this slug, used as a placeholder while the detail loads. */
function findSummary(queryClient: QueryClient, slug: string): ListingSummary | undefined {
  for (const [, data] of queryClient.getQueriesData<ListPages>({ queryKey: listingKeys.lists() })) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find((l) => l.slug === slug)
      if (hit) return hit
    }
  }
  return undefined
}

/**
 * Cards must show a listing's true state (PRD FE-EXP-05, QA-07): when a fresh detail disagrees with a
 * cached card, the card is corrected in every list that holds it.
 */
function syncCards(queryClient: QueryClient, detail: ListingDetail) {
  queryClient.setQueriesData<ListPages>({ queryKey: listingKeys.lists() }, (data) => {
    if (!data) return data
    let changed = false
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (item.slug !== detail.slug) return item
        if (
          item.status === detail.status &&
          item.urgencyEndsAt === detail.urgencyEndsAt &&
          item.askingKobo === detail.askingKobo
        ) {
          return item
        }
        changed = true
        return { ...item, status: detail.status, urgencyEndsAt: detail.urgencyEndsAt, askingKobo: detail.askingKobo }
      }),
    }))
    return changed ? { ...data, pages } : data
  })
}

function fetchListing(queryClient: QueryClient, slug: string, signal?: AbortSignal) {
  return apiClient.get<ListingDetail>(`/listings/${encodeURIComponent(slug)}`, { signal }).then((r) => {
    syncCards(queryClient, r.data)
    return r.data
  })
}

export function listingQueryOptions(queryClient: QueryClient, slug: string) {
  return {
    queryKey: listingKeys.detail(slug),
    queryFn: ({ signal }: { signal?: AbortSignal }) => fetchListing(queryClient, slug, signal),
  }
}

export function useListing(slug: string) {
  const queryClient = useQueryClient()
  return useQuery({
    ...listingQueryOptions(queryClient, slug),
    // Availability is rechecked on open unless it was fetched moments ago (hover prefetch) (FE-LDT-03)
    staleTime: 10_000,
    // Show the card's facts and photo at once while the full detail loads. Only the summary fields are
    // real during that time: the page checks `isPlaceholderData` before reading detail-only fields.
    placeholderData: () => findSummary(queryClient, slug) as ListingDetail | undefined,
  })
}

/** Start loading a listing on hover or touch so the detail opens with data (PRD §12), unless saving data. */
export function usePrefetchListing() {
  const queryClient = useQueryClient()
  return (slug: string) =>
    savesData()
      ? undefined
      : queryClient.prefetchQuery({ ...listingQueryOptions(queryClient, slug), staleTime: 30_000 })
}

export function useListingSuggestions(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: listingKeys.suggest(term.toLowerCase()),
    queryFn: ({ signal }) =>
      apiClient.get<ListingSuggestion[]>('/listings/suggest', { params: { q: term }, signal }).then((r) => r.data),
    enabled: term.length >= 2,
    staleTime: 60_000,
  })
}

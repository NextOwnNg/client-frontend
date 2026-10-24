import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useRuntimeConfig } from '@/features/config/api'
import { parseFilters, serializeFilters, type ListingFilters } from '@/features/listings/filters'
import { useUiStore } from '@/stores/ui'

const sameIds = (a: string[], b: string[]) => a.join(',') === b.join(',')

/**
 * Explore's filters, read from and written to the URL (PRD §7.7), so Back from a listing and shared links
 * keep them. The browsing areas are the header's areas: a link's `area` seeds them once, and after that the
 * header (or the filter panel) owns them and the URL follows.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()
  const { data: config } = useRuntimeConfig()
  const areaIds = useUiStore((s) => s.areaIds)
  const setAreaIds = useUiStore((s) => s.setAreaIds)

  const parsed = useMemo(() => parseFilters(params, config), [params, config])
  const urlAreas = parsed.filters.areas
  const urlHasAreas = params.has('area')

  // A shared link's areas win once, on arrival
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !config) return
    seeded.current = true
    if (urlHasAreas && !sameIds(urlAreas, areaIds)) setAreaIds(urlAreas)
  }, [config, urlHasAreas, urlAreas, areaIds, setAreaIds])

  // After that the header's areas drive the URL
  useEffect(() => {
    if (!seeded.current || sameIds(urlAreas, areaIds)) return
    const next = new URLSearchParams(params)
    if (areaIds.length) next.set('area', areaIds.join(','))
    else next.delete('area')
    setParams(next, { replace: true, preventScrollReset: true })
  }, [areaIds, urlAreas, params, setParams])

  // The URL catches up with the header's areas within a render, so the URL's value is the one to query
  const filters: ListingFilters = useMemo(
    () => ({ ...parsed.filters, areas: urlHasAreas ? urlAreas : areaIds }),
    [parsed.filters, urlHasAreas, urlAreas, areaIds],
  )

  const setFilters = useCallback(
    (next: ListingFilters) => {
      if (!sameIds(next.areas, areaIds)) setAreaIds(next.areas)
      setParams(serializeFilters(next), { preventScrollReset: true })
    },
    [areaIds, setAreaIds, setParams],
  )

  return { filters, issues: parsed.issues, setFilters, config }
}

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useRuntimeConfig } from '@/features/config/api'
import { parseFilters, serializeFilters, type ListingFilters } from '@/features/listings/filters'
import { useUiStore } from '@/stores/ui'

/**
 * Explore's filters, read from and written to the URL (PRD §7.7), so Back from a listing and shared links
 * keep them. The browsing area is the header's area: a link's `area` seeds it once, and after that the
 * header (or the filter panel) owns it and the URL follows.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()
  const { data: config } = useRuntimeConfig()
  const areaId = useUiStore((s) => s.areaId)
  const setAreaId = useUiStore((s) => s.setAreaId)

  const parsed = useMemo(() => parseFilters(params, config), [params, config])
  const urlArea = parsed.filters.area

  // A shared link's area wins once, on arrival
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !config) return
    seeded.current = true
    if (urlArea && urlArea !== areaId) setAreaId(urlArea)
  }, [config, urlArea, areaId, setAreaId])

  // After that the header's area drives the URL
  useEffect(() => {
    if (!seeded.current || urlArea === (areaId ?? undefined)) return
    const next = new URLSearchParams(params)
    if (areaId) next.set('area', areaId)
    else next.delete('area')
    setParams(next, { replace: true, preventScrollReset: true })
  }, [areaId, urlArea, params, setParams])

  // The URL catches up with the header's area within a render, so the URL's value is the one to query
  const filters: ListingFilters = useMemo(
    () => ({ ...parsed.filters, area: urlArea ?? areaId ?? undefined }),
    [parsed.filters, areaId, urlArea],
  )

  const setFilters = useCallback(
    (next: ListingFilters) => {
      if ((next.area ?? null) !== areaId) setAreaId(next.area ?? null)
      setParams(serializeFilters(next), { preventScrollReset: true })
    },
    [areaId, setAreaId, setParams],
  )

  return { filters, issues: parsed.issues, setFilters, config }
}

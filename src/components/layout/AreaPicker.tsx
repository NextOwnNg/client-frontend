import { ChevronDown, MapPin } from 'lucide-react'
import { useAreaSheet } from '@/components/layout/use-area-sheet'
import { useRuntimeConfig } from '@/features/config/api'
import { useUiStore } from '@/stores/ui'

/** Area pill in the header. Coarse area only; we never ask for or detect a home location. */
export function AreaPicker() {
  const areaSheet = useAreaSheet()
  const { data: config } = useRuntimeConfig()
  const areaId = useUiStore((s) => s.areaId)

  const selected = config?.areas.find((a) => a.id === areaId)
  const label = selected?.name ?? 'All areas'

  return (
    <>
      <button
        type="button"
        onClick={areaSheet.open}
        // Start fetching the sheet before the tap lands
        onPointerEnter={areaSheet.preload}
        onFocus={areaSheet.preload}
        onTouchStart={areaSheet.preload}
        aria-label={`Browsing area: ${label}. Change area`}
        className="inline-flex h-11 max-w-44 min-w-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-compact font-medium text-ink transition-[border-color,transform] duration-120 ease-out active:scale-[0.97] tablet:px-3 pointer-fine:hover:border-action/50"
      >
        <MapPin aria-hidden className="size-4 shrink-0 text-action" />
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
      </button>

      {areaSheet.sheet}
    </>
  )
}

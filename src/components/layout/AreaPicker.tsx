import { Button } from '@heroui/react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useState } from 'react'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { useRuntimeConfig } from '@/features/config/api'
import { useUiStore } from '@/stores/ui'

/** Area pill in the header. Coarse area only; we never ask for or detect a home location. */
export function AreaPicker() {
  const [open, setOpen] = useState(false)
  const { data: config } = useRuntimeConfig()
  const areaId = useUiStore((s) => s.areaId)
  const setAreaId = useUiStore((s) => s.setAreaId)

  const selected = config?.areas.find((a) => a.id === areaId)
  const label = selected?.name ?? 'All areas'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Browsing area: ${label}. Change area`}
        className="inline-flex h-11 max-w-44 min-w-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 tablet:px-3 text-compact font-medium text-ink transition-[border-color,transform] duration-120 ease-out active:scale-[0.97] pointer-fine:hover:border-action/50"
      >
        <MapPin aria-hidden className="size-4 shrink-0 text-action" />
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Where are you browsing?"
        footer={
          <Button variant="primary" fullWidth onPress={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="mb-4 text-compact text-muted">
          We show items near this area. We never ask for your exact location.
        </p>
        <RadioCards
          label="Area"
          hideLabel
          value={areaId ?? 'all'}
          onChange={(value) => setAreaId(value === 'all' ? null : value)}
          options={[
            { value: 'all', title: `All of ${config?.cityName ?? 'the pilot city'}` },
            ...(config?.areas ?? []).map((a) => ({ value: a.id, title: a.name })),
          ]}
        />
      </Sheet>
    </>
  )
}

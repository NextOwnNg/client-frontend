import { Button } from '@heroui/react'
import { CheckList } from '@/components/ui/ChoiceList'
import { Sheet } from '@/components/ui/Sheet'
import { useRuntimeConfig } from '@/features/config/api'
import { useUiStore } from '@/stores/ui'

/** The area chooser body; loaded on first open so sheet code stays out of the entry chunk. */
export function AreaSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: config } = useRuntimeConfig()
  const areaIds = useUiStore((s) => s.areaIds)
  const setAreaIds = useUiStore((s) => s.setAreaIds)
  const city = config?.cityName ?? 'the pilot city'

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Where are you browsing?"
      footer={
        <div className="flex w-full items-center gap-3">
          <Button variant="tertiary" isDisabled={areaIds.length === 0} onPress={() => setAreaIds([])}>
            Clear
          </Button>
          <Button variant="primary" className="flex-1" onPress={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-compact text-muted">
        Pick one or more areas, or none to browse all of {city}. We never ask for your exact location.
      </p>
      <CheckList
        label="Area"
        options={(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
        value={areaIds}
        onChange={setAreaIds}
      />
    </Sheet>
  )
}

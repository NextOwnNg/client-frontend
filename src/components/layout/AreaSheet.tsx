import { Button } from '@heroui/react'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { useRuntimeConfig } from '@/features/config/api'
import { useUiStore } from '@/stores/ui'

/** The area chooser body; loaded on first open so sheet code stays out of the entry chunk. */
export function AreaSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: config } = useRuntimeConfig()
  const areaId = useUiStore((s) => s.areaId)
  const setAreaId = useUiStore((s) => s.setAreaId)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Where are you browsing?"
      footer={
        <Button variant="primary" fullWidth onPress={() => onOpenChange(false)}>
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
  )
}

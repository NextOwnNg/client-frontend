import { ItemThumb } from '@/features/offers/components/OfferParts'

export function MiniSide({ label, title, photoUrl }: { label: string; title: string; photoUrl?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-control border border-border bg-surface p-3">
      <p className="text-caption font-semibold text-muted">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <ItemThumb url={photoUrl} size="sm" />
        <p className="line-clamp-2 min-w-0 text-compact font-semibold text-ink">{title}</p>
      </div>
    </div>
  )
}

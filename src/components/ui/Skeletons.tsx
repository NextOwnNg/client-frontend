/** Loading shapes that match the real layouts, so nothing shifts when content arrives. */

export function ListingRowSkeleton() {
  return (
    <div aria-hidden className="flex h-30 overflow-hidden rounded-card border border-border bg-surface">
      <div className="w-28 shrink-0 animate-pulse bg-mint" />
      <div className="flex flex-1 flex-col gap-2 p-3 pl-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-cloud" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-cloud" />
        <div className="mt-auto h-5 w-1/3 animate-pulse rounded bg-cloud" />
      </div>
    </div>
  )
}

export function ListingTileSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="aspect-[4/3] animate-pulse bg-mint" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-cloud" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-cloud" />
      </div>
    </div>
  )
}

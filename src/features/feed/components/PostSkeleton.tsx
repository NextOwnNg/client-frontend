/** A feed post's shape while it loads. */
export function PostSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-full bg-cloud" />
        <div className="h-4 w-32 animate-pulse rounded bg-cloud" />
      </div>
      <div className="aspect-[4/3] animate-pulse rounded-control bg-cloud" />
      <div className="h-4 w-48 animate-pulse rounded bg-cloud" />
    </div>
  )
}

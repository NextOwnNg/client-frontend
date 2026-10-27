/** Placeholder rows while saved items load. */
export function SavedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading saved items" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-30 animate-pulse rounded-card bg-cloud" />
      ))}
    </div>
  )
}

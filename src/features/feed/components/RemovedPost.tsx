/** A post whose listing was removed, or that moderators took down (ruling R6-2). */
export function RemovedPost() {
  return (
    <article className="rounded-card border border-dashed border-border bg-surface px-4 py-5 text-center">
      <p className="text-compact font-semibold text-ink">This post is no longer available</p>
      <p className="mt-1 text-compact text-muted">It was removed, or the item it showed is no longer listed.</p>
    </article>
  )
}

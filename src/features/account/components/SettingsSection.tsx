import { useId, type ReactNode } from 'react'

/** One titled group on the settings page. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 id={id} className="text-h3 text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

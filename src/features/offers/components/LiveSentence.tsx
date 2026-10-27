import { type ReactNode } from 'react'

/** The trade in words as it's being built; read out politely as it changes. */
export function LiveSentence({ children, placeholder }: { children: ReactNode; placeholder: string }) {
  return (
    <p
      aria-live="polite"
      className="rounded-control bg-mint/60 px-4 py-3 text-body font-semibold text-ink data-[empty=true]:bg-cloud data-[empty=true]:font-normal data-[empty=true]:text-muted"
      data-empty={!children}
    >
      {children || placeholder}
    </p>
  )
}

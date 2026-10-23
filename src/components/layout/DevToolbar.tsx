import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useDevSettings } from '@/mocks/dev-settings'

/**
 * Development only: shows that the data is fictional and lets reviewers simulate slow networks,
 * a failed request and guest/member personas.
 */
export function DevToolbar() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { latencyMs, setLatency, failNext, setFailNext, persona, setPersona } = useDevSettings()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-3 z-50 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-caption font-semibold text-paper shadow-overlay desktop:bottom-4"
      >
        <FlaskConical aria-hidden className="size-3.5" />
        Sample data
      </button>
    )
  }

  return (
    <div
      role="region"
      aria-label="Developer tools"
      className="fixed bottom-[calc(152px+env(safe-area-inset-bottom))] left-3 z-50 w-72 rounded-card bg-ink p-4 text-compact text-paper shadow-overlay desktop:bottom-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Mock API · fictional sample data</p>
        <button type="button" aria-label="Close developer tools" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <label className="flex items-center justify-between gap-2 py-1">
        Network delay
        <select
          value={latencyMs}
          onChange={(e) => setLatency(Number(e.target.value))}
          className="rounded bg-white/10 px-2 py-1 text-paper"
        >
          <option value={0}>None</option>
          <option value={400}>Normal (0.4s)</option>
          <option value={1500}>Slow 3G (1.5s)</option>
          <option value={4000}>Very slow (4s)</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 py-1">
        Persona
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value as 'guest' | 'member')}
          className="rounded bg-white/10 px-2 py-1 text-paper"
        >
          <option value="guest">Guest</option>
          <option value="member">Member</option>
        </select>
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setFailNext(true)}
          className="flex-1 rounded-control bg-white/10 px-2 py-2 font-medium hover:bg-white/20"
        >
          {failNext ? 'Next request fails' : 'Fail next request'}
        </button>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries()}
          className="flex-1 rounded-control bg-white/10 px-2 py-2 font-medium hover:bg-white/20"
        >
          Refetch all
        </button>
      </div>
    </div>
  )
}

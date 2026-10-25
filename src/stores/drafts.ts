import { useCallback } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const DRAFT_LIFETIME_MS = 24 * 60 * 60_000

type Draft = { value: unknown; savedAt: number }

/** Drops drafts older than 24 hours. Runs when drafts load from storage and on every save, never during render. */
function fresh(drafts: Record<string, Draft>, now = Date.now()): Record<string, Draft> {
  return Object.fromEntries(Object.entries(drafts).filter(([, d]) => now - d.savedAt < DRAFT_LIFETIME_MS))
}

type DraftState = {
  drafts: Record<string, Draft>
  saveDraft: (key: string, value: unknown) => void
  clearDraft: (key: string) => void
}

/**
 * Form values that must survive a sign-in round trip or a reload (PRD §6.3, §7.7), kept in `sessionStorage`
 * for at most 24 hours. Never phone numbers, codes or tokens.
 */
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (key, value) =>
        set((s) => ({ drafts: { ...fresh(s.drafts), [key]: { value, savedAt: Date.now() } } })),
      clearDraft: (key) =>
        set((s) => {
          const { [key]: _removed, ...drafts } = s.drafts
          return { drafts }
        }),
    }),
    {
      name: 'nextown-drafts',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ drafts }) => ({ drafts }),
      merge: (persisted, current) => {
        const drafts = (persisted as Partial<DraftState> | undefined)?.drafts
        return { ...current, drafts: drafts && typeof drafts === 'object' ? fresh(drafts) : {} }
      },
    },
  ),
)

/** `useState` for a form whose values outlive the page. `initial` applies until something is typed. */
export function useFormDraft<T>(key: string, initial: T): [T, (value: T) => void, () => void] {
  const draft = useDraftStore((s) => s.drafts[key])
  const saveDraft = useDraftStore((s) => s.saveDraft)
  const clearDraft = useDraftStore((s) => s.clearDraft)

  const value = draft ? (draft.value as T) : initial
  const setValue = useCallback((next: T) => saveDraft(key, next), [key, saveDraft])
  const clear = useCallback(() => clearDraft(key), [key, clearDraft])
  return [value, setValue, clear]
}

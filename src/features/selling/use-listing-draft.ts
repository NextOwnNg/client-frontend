import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useCreateListing, useSaveListing } from '@/features/selling/api'
import { emptyListingInput } from '@/features/selling/listing-input'
import { useDraftStore, useFormDraft } from '@/stores/drafts'
import type { ListingInput, OwnListing } from '@/types/api'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_MS = 800

/** Key order fixed by the input type, so "changed?" doesn't depend on how the server orders its JSON. */
export const stableJson = (input: ListingInput) =>
  JSON.stringify(Object.keys(emptyListingInput).map((key) => input[key as keyof ListingInput]))

export const draftKey = (userId: string | null, id: string | undefined) => `listing:${userId}:${id ?? 'new'}`

/**
 * The wizard's form state (PRD §7.7). `initial` is what the server has. Edits live in the session draft store
 * until the server confirms them, so a failed save, a reload or an expired session never loses them.
 * Drafts autosave after a pause, and the first save creates the draft; published listings save on request.
 */
export function useListingDraft({
  id,
  userId,
  initial,
  autosave,
  onCreated,
}: {
  id: string | undefined
  userId: string | null
  initial: ListingInput
  autosave: boolean
  onCreated: (listing: OwnListing, latest: ListingInput) => void
}) {
  const key = draftKey(userId, id)
  const [input, setDraft, clearDraft] = useFormDraft<ListingInput>(key, initial)
  const [savedJson, setSavedJson] = useState(() => stableJson(initial))
  const [state, setState] = useState<SaveState>('idle')
  const create = useCreateListing()
  const save = useSaveListing()
  const latest = useRef(input)
  const inFlight = useRef<Promise<OwnListing | undefined> | null>(null)
  const dirty = stableJson(input) !== savedJson

  useEffect(() => {
    latest.current = input
  }, [input])

  async function persist(): Promise<OwnListing | undefined> {
    const snapshot = latest.current
    const json = stableJson(snapshot)
    setState('saving')
    try {
      const saved = id ? await save.mutateAsync({ id, input: snapshot }) : await create.mutateAsync(snapshot)
      setSavedJson(json)
      setState('saved')
      if (!id) onCreated(saved, latest.current)
      // Nothing typed since: the server has it all, so the local copy can go
      else if (stableJson(latest.current) === json) clearDraft()
      return saved
    } catch (error) {
      setState('error')
      throw error
    }
  }

  /** Saves now if anything is unsaved; waits for a save already in progress. */
  async function flush() {
    if (inFlight.current) await inFlight.current.catch(() => undefined)
    if (stableJson(latest.current) === savedJson && id) return undefined
    inFlight.current = persist()
    try {
      return await inFlight.current
    } finally {
      inFlight.current = null
    }
  }

  const autosaveNow = useEffectEvent(() => void flush().catch(() => undefined))

  useEffect(() => {
    if (!autosave || !dirty || state === 'error') return
    const timer = setTimeout(autosaveNow, AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [input, autosave, dirty, state])

  const change = (changes: Partial<ListingInput>) => {
    if (state === 'error') setState('idle')
    setDraft({ ...latest.current, ...changes })
  }

  return {
    input,
    change,
    dirty,
    state,
    flush,
    retry: () => {
      setState('idle')
      void flush().catch(() => undefined)
    },
    discardLocal: clearDraft,
  }
}

/** Carries edits made while a new draft was being created over to its real key. */
export function moveDraft(from: string, to: string, value: ListingInput) {
  const { saveDraft, clearDraft } = useDraftStore.getState()
  saveDraft(to, value)
  clearDraft(from)
}

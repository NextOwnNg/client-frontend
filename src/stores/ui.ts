import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * UI preferences only (PRD §4.5). The chosen area is a coarse browsing preference, never a location.
 * A list of area ids (the filter model's shape); empty means the whole pilot city.
 */
type UiState = {
  areaIds: string[]
  setAreaIds: (areaIds: string[]) => void
}

export const useUiStore = create<UiState>()(
  persist((set) => ({ areaIds: [], setAreaIds: (areaIds) => set({ areaIds }) }), {
    name: 'nextown-ui',
    version: 2,
    // v0 stored one `areaId`; later versions store the list as it is
    migrate: (persisted, version) => {
      const state = (persisted ?? {}) as { areaId?: string | null; areaIds?: unknown }
      if (version === 0) return { areaIds: state.areaId ? [state.areaId] : [] }
      return { areaIds: Array.isArray(state.areaIds) ? (state.areaIds as string[]) : [] }
    },
  }),
)

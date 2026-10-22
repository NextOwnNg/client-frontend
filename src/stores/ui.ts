import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** UI preferences only (PRD §4.5). The chosen area is a coarse browsing preference, never a location. */
type UiState = {
  areaId: string | null
  setAreaId: (areaId: string | null) => void
}

export const useUiStore = create<UiState>()(
  persist((set) => ({ areaId: null, setAreaId: (areaId) => set({ areaId }) }), { name: 'nextown-ui' }),
)

import { describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/ui'

describe('UI preferences store', () => {
  const migrate = useUiStore.persist.getOptions().migrate!

  it('carries a single saved area from the old format over as a one-item list', () => {
    expect(migrate({ areaId: 'north' }, 0)).toEqual({ areaIds: ['north'] })
    expect(migrate({ areaId: null }, 0)).toEqual({ areaIds: [] })
  })

  it('keeps every saved area, since several can be chosen', () => {
    expect(migrate({ areaIds: ['north', 'east'] }, 1)).toEqual({ areaIds: ['north', 'east'] })
  })

  it('recovers from a corrupted saved value', () => {
    expect(migrate({ areaIds: 'north' }, 1)).toEqual({ areaIds: [] })
  })
})

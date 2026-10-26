import type { ItemCondition } from '../../types/api'

/** Icon-free labels, safe to import from the share-preview edge function. */
const conditions: Record<ItemCondition, string> = {
  LIKE_NEW: 'Like new',
  GOOD: 'Good',
  FAIR: 'Fair',
  FOR_PARTS: 'For parts',
}

export function conditionLabel(condition: ItemCondition): string {
  return conditions[condition]
}

/** One line on what each condition means, shown under the choice. */
export const conditionHelp: Record<ItemCondition, string> = {
  LIKE_NEW: 'No visible wear, and everything works.',
  GOOD: 'Light signs of use. Everything works.',
  FAIR: 'Clear wear or small faults, but it still works.',
  FOR_PARTS: 'Doesn’t fully work. For repair or parts.',
}

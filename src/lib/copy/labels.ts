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

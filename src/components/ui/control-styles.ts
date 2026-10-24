// Hover (mouse only): the chip lifts 1px onto a soft shadow and its edge turns Teal; pressing settles it back.
// transform + shadow only, 120ms, so a pass across a row of chips never feels laggy.
export const chipBase =
  'inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-compact font-medium whitespace-nowrap outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-120 ease-out pointer-fine:hover:-translate-y-px pointer-fine:hover:shadow-card active:translate-y-0 active:scale-[0.97] active:shadow-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2'
export const chipOff =
  'border-border bg-surface text-ink pointer-fine:hover:border-action/60 pointer-fine:hover:text-action'
export const chipOn = 'border-action bg-mint text-action pointer-fine:hover:border-action'

/** 44px row for a checkbox or radio with its label (filter lists, consent boxes). */
export const choiceRow =
  'group flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-1 text-body text-ink outline-none data-focus-visible:ring-2 data-focus-visible:ring-focus data-disabled:cursor-not-allowed data-disabled:text-muted'

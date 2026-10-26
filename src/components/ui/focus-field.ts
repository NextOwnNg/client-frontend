/** Scrolls to a field's wrapper (`id="field-<name>"`) and focuses its first control. */
export function focusField(name: string) {
  const wrapper = document.getElementById(`field-${name}`)
  if (!wrapper) return
  wrapper.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  wrapper.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select, button, [role=radio]')?.focus({
    preventScroll: true,
  })
}

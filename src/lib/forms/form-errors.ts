import type { FieldErrors as FormErrors, FieldValues } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Reports a `field → message` map from shared domain rules (like `validateListing`) as schema issues, so a
 * form's resolver uses the same rules as the server without repeating them. `a.b` keys become nested paths.
 */
export function addFieldIssues(ctx: z.RefinementCtx, errors: Record<string, string>) {
  for (const [field, message] of Object.entries(errors))
    ctx.addIssue({ code: 'custom', path: field.split('.'), message })
}

/** A form's errors as `field → message`, with nested fields as `a.b`, for summaries and step filters. */
export function flattenErrors<T extends FieldValues>(errors: FormErrors<T>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || key === 'ref') continue
    const path = prefix ? `${prefix}.${key}` : key
    const { message } = value as { message?: unknown }
    if (typeof message === 'string' && message) out[path] = message
    else Object.assign(out, flattenErrors(value as FormErrors<T>, path))
  }
  return out
}

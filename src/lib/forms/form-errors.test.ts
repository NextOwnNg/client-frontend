import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { addFieldIssues, flattenErrors } from '@/lib/forms/form-errors'

describe('form errors', () => {
  it('turns domain messages into schema issues, nesting dotted fields', () => {
    const schema = z
      .object({})
      .superRefine((_, ctx) =>
        addFieldIssues(ctx, { title: 'Too short', 'categoryFields.storage': 'Choose an option.' }),
      )
    const issues = schema.safeParse({}).error!.issues
    expect(issues.map((i) => i.path)).toEqual([['title'], ['categoryFields', 'storage']])
  })

  it('flattens nested form errors back to dotted fields', () => {
    const errors = {
      title: { type: 'custom', message: 'Too short' },
      categoryFields: { storage: { type: 'custom', message: 'Choose an option.' } },
      root: { type: 'server', message: '' },
    }
    expect(flattenErrors(errors)).toEqual({ title: 'Too short', 'categoryFields.storage': 'Choose an option.' })
  })
})

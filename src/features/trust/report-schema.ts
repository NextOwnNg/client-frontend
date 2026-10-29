import { z } from 'zod'
import type { MediaRef, ReportReason } from '@/types/api'

export const DESCRIPTION_MAX = 2000
export const EVIDENCE_MAX = 4

const reasons = [
  'PROHIBITED',
  'SCAM',
  'MISLEADING',
  'HARASSMENT',
  'UNSAFE',
  'SPAM',
  'OTHER',
] as const satisfies readonly ReportReason[]

/** Ruling R7-2: a reason always; words only when the reason is "Something else". The server checks the same. */
export const reportSchema = z
  .object({
    // Nothing is chosen at first; the transform turns "nothing" into the message and narrows the type
    reason: z
      .enum(reasons)
      .nullable()
      .transform((reason, ctx) => {
        if (reason) return reason
        ctx.addIssue({ code: 'custom', message: 'Choose what’s wrong.' })
        return z.NEVER
      }),
    description: z.string().trim().max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX} characters.`),
    evidence: z.array(z.custom<MediaRef>()).max(EVIDENCE_MAX, `Add up to ${EVIDENCE_MAX} photos.`),
    alsoBlock: z.boolean(),
  })
  .superRefine(({ reason, description }, ctx) => {
    if (reason === 'OTHER' && description.length < 10) {
      ctx.addIssue({ code: 'custom', path: ['description'], message: 'Tell us what happened in a sentence or two.' })
    }
  })

export type ReportInput = z.input<typeof reportSchema>
export type ReportForm = z.output<typeof reportSchema>

export const emptyReport: ReportInput = { reason: null, description: '', evidence: [], alsoBlock: false }

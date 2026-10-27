import { z } from 'zod'

const nameRule = 'Enter a name between 2 and 40 characters.'

/** The display name rule shared by onboarding and Settings; the server checks the same (PRD §5). */
export const displayNameSchema = z.string().trim().min(2, nameRule).max(40, nameRule)

import { z } from 'zod'
import { authCopy } from '@/features/account/copy'

/** The sign-in and sign-up rules; the server checks the same (PRD §5). */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email(authCopy.invalidEmail))

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

/** A new password. Signing in only checks that one was typed, so an older, shorter password still works. */
export const newPasswordSchema = z.string().min(PASSWORD_MIN, authCopy.passwordRule).max(PASSWORD_MAX)

export const codeSchema = z.string().length(6, authCopy.incompleteCode)

/** `PhoneField` reports a normalised number, or null while what's typed isn't a Nigerian mobile. */
export const phoneSchema = z
  .string()
  .nullable()
  .refine((phone) => phone !== null, authCopy.invalidPhone)

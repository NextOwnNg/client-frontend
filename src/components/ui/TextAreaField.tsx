import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { Field } from '@/components/ui/Field'
import { cx } from '@/lib/cx'

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  hint?: ReactNode
  error?: string | null
}

/** Multi-line text with the same label, hint and error wiring as `TextField`. */
export function TextAreaField({ label, hint, error, className, rows = 4, ...props }: TextAreaFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx('field-input h-auto resize-y py-3 leading-6', className)}
          {...props}
        />
      )}
    </Field>
  )
}

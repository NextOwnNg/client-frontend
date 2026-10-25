import { CircleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Checkbox as AriaCheckbox } from 'react-aria-components'
import { CheckMark } from '@/components/ui/ChoiceList'
import { choiceRow } from '@/components/ui/control-styles'
import { cx } from '@/lib/cx'

type CheckboxProps = {
  children: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  /** Shown under the box and linked to it, e.g. why a required box must be ticked. */
  error?: string | null
  className?: string
}

/** One standalone checkbox (consent, settings) with the same 44px row and tick as the filter lists. */
export function Checkbox({ children, checked, onChange, error, className }: CheckboxProps) {
  const errorId = useId()
  return (
    <div className={cx('flex flex-col', className)}>
      <AriaCheckbox
        isSelected={checked}
        onChange={onChange}
        isInvalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cx(choiceRow, 'items-start py-2.5 [&>span:first-child]:mt-0.5')}
      >
        {({ isSelected }) => (
          <>
            <CheckMark checked={isSelected} invalid={Boolean(error)} />
            <span className="min-w-0">{children}</span>
          </>
        )}
      </AriaCheckbox>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 pl-9 text-compact text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

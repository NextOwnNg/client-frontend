import type { ButtonVariants } from '@heroui/react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cx } from '@/lib/cx'

type ButtonLinkProps = LinkProps & Pick<ButtonVariants, 'variant' | 'size' | 'fullWidth'>

/**
 * A router link that looks like a button, for navigation actions ("Explore items", "List an item").
 * Uses HeroUI's BEM classes directly: `buttonVariants` would pull tailwind-variants into the entry chunk.
 */
export function ButtonLink({ variant = 'primary', size = 'md', fullWidth, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cx('button', fullWidth && 'button--full-width', `button--${size}`, `button--${variant}`, className)}
      {...props}
    />
  )
}

type PlainButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Pick<ButtonVariants, 'variant' | 'size' | 'fullWidth'>

/**
 * A native button with HeroUI's button styles (its CSS covers hover, active, disabled and focus-visible).
 * For simple actions on first-load screens (Home, empty and error states): HeroUI's `Button` brings
 * react-aria and tailwind-variants into the entry chunk. Dialogs and forms keep using `Button`.
 */
export function PlainButton({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  ...props
}: PlainButtonProps) {
  return (
    <button
      type={type}
      className={cx('button', fullWidth && 'button--full-width', `button--${size}`, `button--${variant}`, className)}
      {...props}
    />
  )
}

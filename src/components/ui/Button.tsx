import { buttonVariants, type ButtonVariants } from '@heroui/react'
import { Link, type LinkProps } from 'react-router'
import { cx } from '@/lib/cx'

export { Button } from '@heroui/react'

type ButtonLinkProps = LinkProps & Pick<ButtonVariants, 'variant' | 'size' | 'fullWidth'>

/** A router link that looks like a button, for navigation actions ("Explore items", "List an item"). */
export function ButtonLink({ variant = 'primary', size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cx(buttonVariants({ variant, size, fullWidth }), className as string)} {...props} />
}

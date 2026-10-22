import { Drawer, Modal } from '@heroui/react'
import type { ReactNode } from 'react'
import { breakpoints, useMediaQuery } from '@/hooks/useMediaQuery'

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  /** Pinned actions (e.g. "Show 24 results"); stays visible while the body scrolls. */
  footer?: ReactNode
}

/**
 * Bottom sheet on phones (drag down to dismiss), centred dialog from 768px.
 * Focus is trapped while open and returns to the trigger on close (React Aria).
 */
export function Sheet({ open, onOpenChange, title, children, footer }: SheetProps) {
  const isTablet = useMediaQuery(breakpoints.tablet)

  if (isTablet) {
    return (
      <Modal isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Backdrop>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog className="rounded-card">
              <Modal.CloseTrigger aria-label="Close" />
              <Modal.Header>
                <Modal.Heading className="text-h3 text-ink">{title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>{children}</Modal.Body>
              {footer && <Modal.Footer>{footer}</Modal.Footer>}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    )
  }

  return (
    <Drawer isOpen={open} onOpenChange={onOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="max-h-[88dvh] rounded-t-feature pb-[env(safe-area-inset-bottom)]">
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="text-h3 text-ink">{title}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>{children}</Drawer.Body>
            {footer && <Drawer.Footer className="border-t border-border">{footer}</Drawer.Footer>}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}

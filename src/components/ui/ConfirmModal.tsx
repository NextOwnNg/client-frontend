import { Button, Modal } from '@heroui/react'
import { useRef, useState, type ReactNode } from 'react'

type ConfirmModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  /** Resolve to close; throw to keep the modal open (the caller shows the error). */
  onConfirm: () => Promise<void> | void
}

/** Explicit confirmation for consequential actions: states the consequence and never fires twice. */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
}: ConfirmModalProps) {
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)

  async function confirm() {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Caller surfaces the error; keep the dialog open so nothing is lost.
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <Modal isOpen={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <Modal.Backdrop isDismissable={!pending}>
        <Modal.Container size="sm">
          <Modal.Dialog className="rounded-card">
            <Modal.Header>
              <Modal.Heading className="text-h3 text-ink">{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-body text-muted">{body}</Modal.Body>
            <Modal.Footer className="flex-col-reverse gap-2 tablet:flex-row tablet:justify-end">
              <Button variant="tertiary" slot="close" isDisabled={pending} className="w-full tablet:w-auto">
                {cancelLabel}
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                isPending={pending}
                onPress={confirm}
                className="w-full tablet:w-auto"
              >
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

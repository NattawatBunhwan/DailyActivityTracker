import { useEffect, useId, useRef } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type ConfirmDialogProps = {
    isOpen: boolean
    title: string
    message: string
    confirmLabel: string
    onCancel: () => void
    onConfirm: () => void
    triggerButton?: HTMLElement | null
}

export default function ConfirmDialog({ isOpen, title, message, confirmLabel, onCancel, onConfirm, triggerButton }: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const cancelRef = useRef<HTMLButtonElement>(null)
    const titleId = useId()
    useLockBodyScroll(isOpen)

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (isOpen && !dialog.open) {
            dialog.showModal()
            cancelRef.current?.focus()
        } else if (!isOpen && dialog.open) {
            dialog.close()
            requestAnimationFrame(() => {
                if (triggerButton?.isConnected) triggerButton.focus()
            })
        }
    }, [isOpen, triggerButton])

    return <dialog ref={dialogRef} className="modal-overlay" tabIndex={-1} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onCancel() }}>
        <div className="modal confirm-modal">
            <h2 id={titleId}>{title}</h2>
            <p>{message}</p>
            <div className="modal-actions">
                <button ref={cancelRef} type="button" className="confirm-cancel-button" onClick={onCancel}>Cancel</button>
                <button type="button" className="confirm-action-button" onClick={onConfirm}>{confirmLabel}</button>
            </div>
        </div>
    </dialog>
}

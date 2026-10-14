import { useEffect, useRef, type ReactNode } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type DeleteModalProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    children: ReactNode
    isDeleting: boolean
    deleteError: string | null
    triggerButton: HTMLButtonElement | null
}

function DeleteModal({ isOpen, onClose, onConfirm, children, isDeleting, deleteError, triggerButton }: DeleteModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const cancelButtonRef = useRef<HTMLButtonElement>(null)

    useLockBodyScroll(isOpen)

    useEffect(() => {
        const dialog = dialogRef.current

        if (!dialog) {
            return
        }

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal()
            }
            cancelButtonRef.current?.focus()
        } else {
            if (dialog.open) {
                dialog.close()
            }

            requestAnimationFrame(() => {
                if (triggerButton?.isConnected) {
                    triggerButton.focus()
                }
            })
        }
    }, [isOpen, triggerButton])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const dialogRefCurrent = dialogRef.current

        if (!dialogRefCurrent) {
            return
        }

        const dialog: HTMLDialogElement = dialogRefCurrent
        const ownerDocument = dialog.ownerDocument

        function handleTabKey(event: KeyboardEvent) {
            if (event.key !== "Tab" || !dialog.open) {
                return
            }

            const focusableElements = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    [
                        "a[href]",
                        "button:not([disabled])",
                        "input:not([disabled])",
                        "textarea:not([disabled])",
                        "select:not([disabled])",
                        '[tabindex]:not([tabindex="-1"])',
                    ].join(",")
                )
            ).filter((element) => {
                return (
                    element.getAttribute("aria-hidden") !== "true" &&
                    element.getClientRects().length > 0
                )
            })

            if (focusableElements.length === 0) {
                event.preventDefault()
                dialog.focus()
                return
            }

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]
            const activeElement = ownerDocument.activeElement

            if (!dialog.contains(activeElement)) {
                event.preventDefault()
                const targetElement = event.shiftKey ? lastElement : firstElement
                targetElement.focus()
            } else if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault()
                lastElement.focus()
            } else if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault()
                firstElement.focus()
            }
        }

        ownerDocument.addEventListener("keydown", handleTabKey, true)

        return () => {
            ownerDocument.removeEventListener("keydown", handleTabKey, true)
        }
    }, [isOpen])

    return (
        <dialog
            ref={dialogRef}
            className="modal-overlay"
            tabIndex={-1}
            aria-labelledby="delete-modal-title"
            onCancel={(event) => {
                event.preventDefault()
                if (!isDeleting) {
                    onClose()
                }
            }}
        >
            <div className="modal">
                <button
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    disabled={isDeleting}
                    aria-label="Close delete activity modal"
                >
                    ×
                </button>

                {children}

                {deleteError && (
                    <p className="delete-error" role="alert">
                        {deleteError}
                    </p>
                )}

                <div className="modal-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="delete-button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        aria-busy={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </dialog>
    )
}

export default DeleteModal

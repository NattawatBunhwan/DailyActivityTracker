import { useEffect, useRef, type ReactNode } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type EditModalProps = {
    isOpen: boolean
    onClose: () => void
    isUpdating: boolean
    children: ReactNode
}

function EditModal({ isOpen, onClose, isUpdating, children }: EditModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)

    useLockBodyScroll(isOpen)

    useEffect(() => {
        const dialog = dialogRef.current

        if (!dialog) {
            return
        }

        if (isOpen && !dialog.open) {
            dialog.showModal()
        } else if (!isOpen && dialog.open) {
            dialog.close()
        }
    }, [isOpen])

    function getFocusableElements() {
        if (!modalRef.current) {
            return []
        }

        return Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
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
            return element.getAttribute("aria-hidden") !== "true"
        })
    }

    useEffect(() => {
        if (!isOpen) {
            return
        }

        function handleTabKey(event: KeyboardEvent) {
            if (event.key !== "Tab") {
                return
            }

            const focusableElements = getFocusableElements()

            if (focusableElements.length === 0) {
                event.preventDefault()
                return
            }

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault()
                lastElement.focus()
            } else if (!event.shiftKey && document.activeElement === lastElement
            ) {
                event.preventDefault()
                firstElement.focus()
            }
        }

        document.addEventListener("keydown", handleTabKey)

        return () => {
            document.removeEventListener("keydown", handleTabKey)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        closeButtonRef.current?.focus()
    }, [isOpen])

    return (
        <dialog
            ref={dialogRef}
            className="modal-overlay"
            onCancel={(event) => {
                event.preventDefault()
                if (!isUpdating) {
                    onClose()
                }
            }}
        >
            <div
                ref={modalRef}
                className="modal modal--form"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close edit activity modal"
                    disabled={isUpdating}
                >
                    ×
                </button>

                {children}
            </div>
        </dialog>
    )
}

export default EditModal

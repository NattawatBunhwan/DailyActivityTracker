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

    useLockBodyScroll(isOpen)

    useEffect(() => {
        if (!isOpen || isUpdating) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen, onClose, isUpdating])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        closeButtonRef.current?.focus()

        console.log("Close button:", closeButtonRef.current)
        console.log("Focused element:", document.activeElement)
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    return (
        <div className="modal-overlay">
            <div className="modal modal--form">
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
        </div>
    )
}

export default EditModal
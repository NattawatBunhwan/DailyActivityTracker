import { useEffect, type ReactNode } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type CreateModalProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function CreateModal({ isOpen, onClose, children }: CreateModalProps) {
    useLockBodyScroll(isOpen)

    useEffect(() => {
        if (!isOpen) {
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
    }, [isOpen, onClose])

    if (!isOpen) {
        return null
    }

    return (
        <div className="modal-overlay">
            <div className="modal modal--form">
                <button
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close create activity modal"
                >
                    ×
                </button>

                {children}
            </div>
        </div>
    )
}

export default CreateModal
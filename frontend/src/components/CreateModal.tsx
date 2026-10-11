import { type ReactNode } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type CreateModalProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function CreateModal({ isOpen, onClose, children }: CreateModalProps) {
    useLockBodyScroll(isOpen)

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
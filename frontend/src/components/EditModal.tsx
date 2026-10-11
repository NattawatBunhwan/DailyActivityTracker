import { type ReactNode } from "react"
import { useLockBodyScroll } from "../hooks/useLockBodyScroll"
import "./Modal.css"

type EditModalProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function EditModal({ isOpen, onClose, children }: EditModalProps) {
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
                    aria-label="Close edit activity modal"
                >
                    ×
                </button>

                {children}
            </div>
        </div>
    )
}

export default EditModal
import type { ReactNode } from "react"
import "./EditModal.css"

type DeleteModalProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    children: ReactNode
}

function DeleteModal({ isOpen, onClose, onConfirm, children }: DeleteModalProps) {
    if (!isOpen) {
        return null
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <button
                    type="button"
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close delete activity modal"
                >
                    ×
                </button>

                {children}

                <div className="modal-actions">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="delete-button"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteModal
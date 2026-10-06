import type { ReactNode } from "react"
import "./EditModal.css"

type DeleteModalProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    children: ReactNode
    isDeleting: boolean
    deleteError: string | null
}

function DeleteModal({ isOpen, onClose, onConfirm, children, isDeleting, deleteError }: DeleteModalProps) {
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
                    disabled={isDeleting}
                    aria-label="Close delete activity modal"
                >
                    ×
                </button>

                {children}

                {deleteError && (
                    <p className="delete-error">
                        {deleteError}
                    </p>
                )}

                <div className="modal-actions">
                    <button
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
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteModal
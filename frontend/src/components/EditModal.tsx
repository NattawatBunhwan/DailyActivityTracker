import { useEffect, type ReactNode } from "react"
import "./Modal.css"

type EditModalProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function EditModal({ isOpen, onClose, children }: EditModalProps) {
    useEffect(() => {
        if (!isOpen) {
            return 
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen])

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
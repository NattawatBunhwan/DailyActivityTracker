import { useEffect, type ReactNode } from "react"
import "./Modal.css"

type CreateModalProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function CreateModal({ isOpen, onClose, children }: CreateModalProps) {
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
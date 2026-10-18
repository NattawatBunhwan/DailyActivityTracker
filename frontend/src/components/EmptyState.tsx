
import "./EmptyState.css"

type EmptyStateProps = {
    onOpenCreateModal: (trigger: HTMLButtonElement) => void
}

function EmptyState({ onOpenCreateModal }: EmptyStateProps) {
    return (
        <section className="empty-state" aria-labelledby="empty-state-title">
            <div className="empty-state-icon" aria-hidden="true">
                <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                    <path d="m9 15 2 2 4-4" />
                </svg>
            </div>

            <h2 id="empty-state-title">Your day starts here</h2>

            <p className="empty-state-description">
                You haven't created any activities yet.
                Start planning your day by creating your first activity.
            </p>

            <button
                type="button"
                className="empty-state-button"
                onClick={(event) =>
                    onOpenCreateModal(event.currentTarget)
                }
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                >
                    <path d="M12 5v14M5 12h14" />
                </svg>
                Create Activity
            </button>
        </section>
    )
}

export default EmptyState

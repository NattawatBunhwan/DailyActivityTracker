import "./EmptyState.css"

type EmptyStateProps = {
    onOpenCreateModal: () => void
}

function EmptyState({ onOpenCreateModal }: EmptyStateProps) {
    return (
        <section className="empty-state">
            <header>
                <h2>No activities yet</h2>
            </header>

            <p>You haven't created any activities yet.</p>

            <button onClick={onOpenCreateModal}>
                Create your first activity
            </button>
        </section>
    )
}

export default EmptyState
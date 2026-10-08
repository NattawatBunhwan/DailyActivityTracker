import "./EmptyState.css"

function EmptyState() {
    return (
        <section className="empty-state">
            <header>
                <h2>No activities yet</h2>
            </header>

            <p>You haven't created any activities yet.</p>
            <p>Click "CreateActivity" above to create your first activity.</p>
        </section>
    )
}

export default EmptyState
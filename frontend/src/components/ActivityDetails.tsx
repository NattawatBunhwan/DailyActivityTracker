
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, CalendarDays, CalendarPlus, CalendarClock, Pencil, Trash2 } from "lucide-react"
import { deleteActivity, getActivityById } from "../api/activityApi"
import type { Activity } from "../types/activity"
import { getPriorityLabel, getStatusLabel } from "../utils/activity"
import useAuth from "../hooks/useAuth"
import EditActivityForm from "./EditActivityForm"
import EditModal from "./EditModal"
import DeleteModal from "./DeleteModal"
import "./ActivityDetails.css"

type ActivityDetailsProps = {
    activityId: string
    onBack: () => void
    onDeleted: () => void
}

function formatDate(value: string | null | undefined): string | null {
    if (!value) return null

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return null

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date)
}

function ActivityDetails({ activityId, onBack, onDeleted }: ActivityDetailsProps) {
    const auth = useAuth()

    const [activity, setActivity] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [unsaved, setUnsaved] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleteTrigger, setDeleteTrigger] = useState<HTMLButtonElement | null>(null)

    const load = useCallback(async () => {
        if (!auth.token) {
            setError("Please sign in to view this activity.")
            setLoading(false)
            return
        }

        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                activityId,
            )
        ) {
            setError("This activity link is invalid.")
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            setActivity(await getActivityById(auth.token, activityId))
        } catch {
            setActivity(null)
            setError(
                "Could not load this activity. It may not exist or you may need to sign in again.",
            )
        } finally {
            setLoading(false)
        }
    }, [activityId, auth.token])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void load()
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [load])

    async function confirmDelete() {
        if (!auth.token || !activity || deleting) return

        setDeleting(true)
        setDeleteError(null)

        try {
            await deleteActivity(auth.token, activity.id)
            onDeleted()
        } catch {
            setDeleteError("Could not delete this activity. Please try again.")
        } finally {
            setDeleting(false)
        }
    }

    const statusLabel = activity ? getStatusLabel(activity.status) : ""
    const priorityLabel = activity
        ? getPriorityLabel(activity.priority)
        : ""

    const statusClass = statusLabel
        .toLowerCase()
        .replace(/\s+/g, "-")

    const priorityClass = priorityLabel.toLowerCase()

    return (
        <section className="activity-details">
            <div className="details-topbar">
                <button
                    className="details-back"
                    type="button"
                    onClick={onBack}
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Activities
                </button>

                {!loading && !error && activity && (
                    <div className="details-actions">
                        <button
                            type="button"
                            className="details-edit"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil size={16} aria-hidden="true" />
                            Edit
                        </button>

                        <button
                            type="button"
                            className="details-delete"
                            onClick={(event) => {
                                setDeleteTrigger(event.currentTarget)
                                setDeleteError(null)
                                setDeleteOpen(true)
                            }}
                            disabled={deleting}
                        >
                            <Trash2 size={16} aria-hidden="true" />
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <p role="status">Loading activity...</p>
            ) : error ? (
                <div className="details-message">
                    <p role="alert">{error}</p>
                    <button type="button" onClick={() => void load()}>
                        Retry
                    </button>
                </div>
            ) : (
                activity && (
                    <>
                        <header className="details-header">
                            <div className="details-title-group">
                                <div className="details-title">
                                    <p className="details-eyebrow">
                                        Activity details
                                    </p>
                                    <h1>{activity.title}</h1>
                                </div>

                                <span
                                    className={`details-status status-${statusClass}`}
                                >
                                    {statusLabel}
                                </span>
                            </div>
                        </header>

                        <div className="details-card">
                            <section className="details-section details-description-section">
                                <div className="details-section-heading">
                                    <h2>Description</h2>

                                    <span
                                        className={`details-priority priority-${priorityClass}`}
                                    >
                                        {priorityLabel} Priority
                                    </span>
                                </div>

                                <p className="details-description">
                                    {activity.description?.trim() ||
                                        "No description provided."}
                                </p>
                            </section>

                            <dl className="details-metadata">
                                <div className="details-metadata-item">
                                    <dt>
                                        <CalendarDays
                                            size={15}
                                            aria-hidden="true"
                                        />
                                        Activity date
                                    </dt>
                                    <dd>
                                        {formatDate(activity.activityDate) ??
                                            "Not available"}
                                    </dd>
                                </div>

                                <div className="details-metadata-item">
                                    <dt>
                                        <CalendarPlus
                                            size={15}
                                            aria-hidden="true"
                                        />
                                        Created
                                    </dt>
                                    <dd>
                                        {formatDate(activity.createdAt) ??
                                            "Not available"}
                                    </dd>
                                </div>

                                <div className="details-metadata-item">
                                    <dt>
                                        <CalendarClock
                                            size={15}
                                            aria-hidden="true"
                                        />
                                        Last updated
                                    </dt>
                                    <dd>
                                        {activity.updatedAt
                                            ? formatDate(activity.updatedAt) ??
                                              "Not available"
                                            : "Never updated"}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <EditModal
                            isOpen={editing}
                            onClose={() => {
                                if (
                                    unsaved &&
                                    !updating &&
                                    !window.confirm(
                                        "You have unsaved changes. Are you sure you want to leave?",
                                    )
                                ) {
                                    return
                                }

                                setEditing(false)
                                setUnsaved(false)
                            }}
                            isUpdating={updating}
                        >
                            <EditActivityForm
                                activity={activity}
                                onActivityUpdated={() => {
                                    setEditing(false)
                                    setUnsaved(false)
                                    void load()
                                }}
                                onUnsavedChangesChange={setUnsaved}
                                onUpdatingChange={setUpdating}
                            />
                        </EditModal>

                        <DeleteModal
                            isOpen={deleteOpen}
                            onClose={() => {
                                if (!deleting) {
                                    setDeleteOpen(false)
                                    setDeleteError(null)
                                }
                            }}
                            onConfirm={() => void confirmDelete()}
                            isDeleting={deleting}
                            deleteError={deleteError}
                            triggerButton={deleteTrigger}
                        >
                            <h2 id="delete-modal-title">
                                Delete activity?
                            </h2>
                            <p>
                                Are you sure you want to delete{" "}
                                <strong>“{activity.title}”</strong>?
                            </p>
                        </DeleteModal>
                    </>
                )
            )}
        </section>
    )
}

export default ActivityDetails

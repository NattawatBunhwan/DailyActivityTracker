import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, CalendarDays, CalendarPlus, CalendarClock, Pencil, Trash2 } from "lucide-react"
import { deleteActivity, getActivityById } from "../api/activityApi"
import type { Activity } from "../types/activity"
import { getPriorityLabel, getStatusLabel } from "../utils/activity"
import useAuth from "../hooks/useAuth"
import ActivityEditor from "./ActivityEditor"
import DeleteModal from "./DeleteModal"
import "./ActivityDetails.css"

type Props = {
    activityId: string
    mode: "details" | "edit"
    onBack: () => void
    onEdit: () => void
    onDeleted: () => void
    onDirtyChange: (dirty: boolean) => void
    onSubmittingChange: (submitting: boolean) => void
    onUpdated: (activity: Activity) => void
    onUnavailable: () => void
}

function formatDate(value: string | null | undefined): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export default function ActivityDetails({ activityId, mode, onBack, onEdit, onDeleted, onDirtyChange, onSubmittingChange, onUpdated, onUnavailable }: Props) {
    const auth = useAuth()
    const [activity, setActivity] = useState<Activity | null>(null)
    const [loadedActivityId, setLoadedActivityId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleteTrigger, setDeleteTrigger] = useState<HTMLButtonElement | null>(null)
    const requestId = useRef(0)
    const deleteInFlight = useRef(false)
    const editActionRef = useRef<HTMLButtonElement | null>(null)
    const previousMode = useRef(mode)

    const load = useCallback(async () => {
        const request = ++requestId.current
        setActivity(null)
        setLoadedActivityId(activityId)
        setLoading(true)
        setError(null)
        setNotFound(false)
        if (!auth.token) {
            setError("Please sign in to view this activity.")
            setLoading(false)
            return
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(activityId)) {
            setError("This activity link is invalid.")
            setLoading(false)
            return
        }
        try {
            const result = await getActivityById(auth.token, activityId)
            if (request === requestId.current) { setActivity(result); setLoadedActivityId(activityId) }
        } catch (cause) {
            if (request === requestId.current) {
                setNotFound(cause instanceof Error && "status" in cause && cause.status === 404)
                setError(cause instanceof Error ? cause.message : "Could not load this activity. Please try again.")
            }
        } finally {
            if (request === requestId.current) setLoading(false)
        }
    }, [activityId, auth.token])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => { void load() }, 0)
        return () => { window.clearTimeout(timeoutId); requestId.current += 1 }
    }, [load])

    useEffect(() => {
        if (previousMode.current === "edit" && mode === "details") {
            requestAnimationFrame(() => editActionRef.current?.focus())
        }
        previousMode.current = mode
    }, [mode])

    async function confirmDelete() {
        if (!auth.token || !activity || deleteInFlight.current) return
        deleteInFlight.current = true
        setDeleting(true)
        setDeleteError(null)
        try {
            await deleteActivity(auth.token, activity.id)
            setDeleteOpen(false)
            onDeleted()
        } catch (cause) {
            setDeleteError(cause instanceof Error ? cause.message : "Could not delete this activity. Please try again.")
        } finally {
            deleteInFlight.current = false
            setDeleting(false)
        }
    }

    if (loading || loadedActivityId !== activityId) return <section className="activity-details"><p role="status">Loading activity…</p></section>
    if (error || !activity) return <section className="activity-details"><div className="details-message">
        <p role="alert">{notFound ? "This activity may have been deleted or is no longer available." : error ?? "Could not load this activity."}</p>
        {!notFound && <button type="button" onClick={() => void load()}>Retry</button>}
        <button type="button" onClick={notFound ? onUnavailable : onBack}>{notFound ? "Back to Activities" : "Back"}</button>
    </div></section>

    if (mode === "edit") return <ActivityEditor
        key={`edit-${activity.id}-${activity.updatedAt ?? activity.createdAt}`}
        mode="edit" activity={activity} onBack={onBack} onDirtyChange={onDirtyChange}
        onSubmittingChange={onSubmittingChange} onSaved={saved => { setActivity(saved); onUpdated(saved) }}
    />

    const status = getStatusLabel(activity.status)
    const priority = getPriorityLabel(activity.priority)
    return <section className="activity-details">
        <div className="details-topbar">
            <button className="details-back" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />Back to Activities</button>
            <div className="details-actions">
                <button type="button" className="details-delete" onClick={e => { setDeleteTrigger(e.currentTarget); setDeleteError(null); setDeleteOpen(true) }} disabled={deleting}><Trash2 size={16} aria-hidden="true" />Delete</button>
                <button ref={editActionRef} type="button" className="details-edit" onClick={onEdit}><Pencil size={16} aria-hidden="true" />Edit</button>
            </div>
        </div>
        <header className="details-header"><div className="details-title-group"><div className="details-title"><p className="details-eyebrow">Activity details</p><h1>{activity.title}</h1></div><div className="details-status-group"><span className="details-status-label">Status</span><span className={`details-status status-${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span></div></div></header>
        <div className="details-card">
            <section className="details-section details-description-section"><div className="details-section-heading"><h2>Description</h2></div><p className="details-description">{activity.description?.trim() || "No description provided."}</p><div className="details-priority-row"><span className="details-priority-label">Priority</span><span className={`details-priority priority-${priority.toLowerCase()}`}>{priority}</span></div></section>
            <dl className="details-metadata">
                <div className="details-metadata-item"><dt><CalendarDays size={15} aria-hidden="true" />Activity date</dt><dd>{formatDate(activity.activityDate) ?? "Not available"}</dd></div>
                <div className="details-metadata-item"><dt><CalendarPlus size={15} aria-hidden="true" />Created</dt><dd>{formatDate(activity.createdAt) ?? "Not available"}</dd></div>
                <div className="details-metadata-item"><dt><CalendarClock size={15} aria-hidden="true" />Last updated</dt><dd>{activity.updatedAt ? formatDate(activity.updatedAt) ?? "Not available" : "Never updated"}</dd></div>
            </dl>
        </div>
        <DeleteModal isOpen={deleteOpen} onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteError(null) } }} onConfirm={() => void confirmDelete()} isDeleting={deleting} deleteError={deleteError} triggerButton={deleteTrigger}>
            <h2 id="delete-modal-title">Delete activity?</h2><p>Are you sure you want to delete <strong>“{activity.title}”</strong>?</p>
        </DeleteModal>
    </section>
}

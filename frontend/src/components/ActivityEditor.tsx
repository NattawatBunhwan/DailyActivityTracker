import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowLeft, CalendarDays, CalendarPlus, CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { Activity, ActivityPriority, ActivityStatus, CreateActivityRequest, UpdateActivityRequest } from "../types/activity"
import { createActivity, updateActivity } from "../api/activityApi"
import useAuth from "../hooks/useAuth"
import { getPriorityLabel, getStatusLabel } from "../utils/activity"
import "./ActivityDetails.css"
import "./ActivityForm.css"

type Props = {
    mode: "create" | "edit"
    activity?: Activity
    onBack: () => void
    onDirtyChange: (dirty: boolean) => void
    onSubmittingChange: (submitting: boolean) => void
    onSaved: (activity: Activity) => void
}

function localDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function localTime(value: string) {
    const date = new Date(value)
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function displayDate(value: string | null | undefined) {
    if (!value || Number.isNaN(new Date(value).getTime())) return "Not available"
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function CustomDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [open, setOpen] = useState(false)
    const [monthOpen, setMonthOpen] = useState(false)
    const [yearOpen, setYearOpen] = useState(false)
    const yearListRef = useRef<HTMLDivElement>(null)
    const monthListRef = useRef<HTMLDivElement>(null)
    const [month, setMonth] = useState(() => {
        const date = value ? new Date(`${value}T12:00:00`) : new Date()
        return new Date(date.getFullYear(), date.getMonth(), 1)
    })
    const rootRef = useRef<HTMLDivElement>(null)
    const pad = (number: number) => String(number).padStart(2, "0")
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const selectedDate = value ? new Date(`${value}T12:00:00`) : null
    const currentYear = new Date().getFullYear()
    const minYear = currentYear - 7
    const maxYear = currentYear + 3
    const weekdays = Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, 7 + index)),
    )
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index)

    useEffect(() => {
        if (!open) return
        const closeOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setOpen(false)
                setMonthOpen(false)
                setYearOpen(false)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false)
                setMonthOpen(false)
                setYearOpen(false)
            }
        }
        document.addEventListener("pointerdown", closeOutside)
        document.addEventListener("keydown", closeOnEscape)
        return () => {
            document.removeEventListener("pointerdown", closeOutside)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [open])

    useEffect(() => {
        if (yearOpen && yearListRef.current) {
            const selectedIndex = month.getFullYear() - minYear
            yearListRef.current.scrollTop = Math.max(0, selectedIndex * 30 - 60)
        }
        if (monthOpen && monthListRef.current) {
            monthListRef.current.scrollTop = Math.max(0, month.getMonth() * 32 - 64)
        }
    }, [yearOpen, monthOpen, month, minYear])

    function changeMonth(offset: number) {
        const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1)
        if (nextMonth.getFullYear() >= minYear && nextMonth.getFullYear() <= maxYear) setMonth(nextMonth)
    }

    return <div className="editor-date-picker" ref={rootRef}>
        <button type="button" className="editor-date-trigger" aria-label="Choose activity date" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => {
            if (current) {
                setMonthOpen(false)
                setYearOpen(false)
                return false
            }
            setMonthOpen(false)
            setYearOpen(false)
            return true
        })}>
            <span>{selectedDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(selectedDate) : "Choose date"}</span><CalendarDays size={16} aria-hidden="true" />
        </button>
        {open && <div className="editor-calendar-panel" role="dialog" aria-label="Choose activity date">
            <div className="editor-calendar-header">
                <button type="button" aria-label="Previous month" disabled={month.getFullYear() === minYear && month.getMonth() === 0} onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
                <div className="editor-calendar-selects">
                    <div className="editor-month-picker">
                        <button type="button" className="editor-month-trigger" aria-label="Choose month" aria-haspopup="listbox" aria-expanded={monthOpen} onClick={() => { setMonthOpen(current => !current); setYearOpen(false) }}>{new Intl.DateTimeFormat(undefined, { month: "long" }).format(month)}</button>
                        {monthOpen && <div className="editor-month-list" role="listbox" aria-label="Choose month" ref={monthListRef}>
                            {Array.from({ length: 12 }, (_, index) => <button type="button" role="option" aria-selected={month.getMonth() === index} className={month.getMonth() === index ? "is-selected" : ""} key={index} onClick={() => { setMonth(new Date(month.getFullYear(), index, 1)); setMonthOpen(false) }}>{new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2024, index, 1))}</button>)}
                        </div>}
                    </div>
                    <div className="editor-year-picker">
                        <button type="button" className="editor-year-trigger" aria-label="Choose year" aria-haspopup="listbox" aria-expanded={yearOpen} onClick={() => { setYearOpen(current => !current); setMonthOpen(false) }}>{month.getFullYear()}</button>
                        {yearOpen && <div className="editor-year-list" role="listbox" aria-label="Choose year" ref={yearListRef}>
                            {years.map(year => <button type="button" role="option" aria-selected={month.getFullYear() === year} className={month.getFullYear() === year ? "is-selected" : ""} key={year} onClick={() => { setMonth(new Date(year, month.getMonth(), 1)); setYearOpen(false) }}>{year}</button>)}
                        </div>}
                    </div>
                </div>
                <button type="button" aria-label="Next month" disabled={month.getFullYear() === maxYear && month.getMonth() === 11} onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
            </div>
            <div className="editor-calendar-grid" role="grid">
                {weekdays.map((day, index) => <span className="editor-calendar-weekday" key={`${day}-${index}`}>{day}</span>)}
                {Array.from({ length: firstDay }, (_, index) => <span className="editor-calendar-empty" key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1
                    const dateValue = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(day)}`
                    const selected = dateValue === value
                    return <button type="button" role="gridcell" aria-selected={selected} className={`editor-calendar-day${selected ? " is-selected" : ""}`} key={dateValue} onClick={() => { onChange(dateValue); setOpen(false) }}>{day}</button>
                })}
            </div>
        </div>}
    </div>
}

function CustomTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const [hour, minute] = value ? value.split(":") : ["", ""]

    useEffect(() => {
        if (!open) return
        const closeOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
        document.addEventListener("pointerdown", closeOutside)
        document.addEventListener("keydown", closeOnEscape)
        return () => {
            document.removeEventListener("pointerdown", closeOutside)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [open])

    return <div className="editor-time-picker" ref={rootRef}>
        <button type="button" className="editor-date-trigger" aria-label="Choose activity time" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)}>
            <span>{value || "Choose time"}</span><CalendarClock size={16} aria-hidden="true" />
        </button>
        {open && <div className="editor-time-panel" role="dialog" aria-label="Choose activity time">
            <div className="editor-time-column"><strong>Hour</strong><div>{Array.from({ length: 24 }, (_, index) => padTime(index)).map(option => <button type="button" className={hour === option ? "is-selected" : ""} key={option} onClick={() => { onChange(`${option}:${minute || "00"}`) }}>{option}</button>)}</div></div>
            <div className="editor-time-column"><strong>Minute</strong><div>{Array.from({ length: 60 }, (_, index) => padTime(index)).map(option => <button type="button" className={minute === option ? "is-selected" : ""} key={option} onClick={() => { onChange(`${hour || "00"}:${option}`) }}>{option}</button>)}</div></div>
            <button type="button" className="editor-time-done" onClick={() => setOpen(false)}>Done</button>
        </div>}
    </div>
}

function padTime(value: number) { return String(value).padStart(2, "0") }

export default function ActivityEditor({ mode, activity, onBack, onDirtyChange, onSubmittingChange, onSaved }: Props) {
    const auth = useAuth()
    const [createDefaults] = useState(() => new Date())
    const defaultDay = localDate(createDefaults.toISOString())
    const defaultTime = localTime(createDefaults.toISOString())
    const [title, setTitle] = useState(activity?.title ?? "")
    const [description, setDescription] = useState(activity?.description ?? "")
    const [activityDay, setActivityDay] = useState(activity ? localDate(activity.activityDate) : defaultDay)
    const [activityTime, setActivityTime] = useState(activity ? localTime(activity.activityDate) : defaultTime)
    const [status, setStatus] = useState<ActivityStatus>(activity?.status ?? 1)
    const [priority, setPriority] = useState<ActivityPriority>(activity?.priority ?? 1)
    const [submitting, setSubmitting] = useState(false)
    const submittingRef = useRef(false)
    const [error, setError] = useState("")
    const [fieldErrors, setFieldErrors] = useState({ title: "", activityDay: "", activityTime: "" })
    const [openChoice, setOpenChoice] = useState<"status" | "priority" | null>(null)
    const initial = JSON.stringify({
        title: activity?.title.trim() ?? "",
        description: activity?.description?.trim() || "",
        day: activity ? localDate(activity.activityDate) : defaultDay,
        time: activity ? localTime(activity.activityDate) : defaultTime,
        status: activity?.status ?? 1,
        priority: activity?.priority ?? 1,
    })
    const current = JSON.stringify({ title: title.trim(), description: description.trim(), day: activityDay, time: activityTime, status, priority })
    const dirty = current !== initial
    const valid = Boolean(title.trim() && activityDay && activityTime)

    useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (submittingRef.current) return
        const nextFieldErrors = {
            title: title.trim() ? "" : "Activity title is required.",
            activityDay: activityDay ? "" : "Activity date is required.",
            activityTime: activityTime ? "" : "Activity time is required.",
        }
        setFieldErrors(nextFieldErrors)
        if (Object.values(nextFieldErrors).some(Boolean)) return
        if (!auth.token) { setError("Please sign in to save this activity."); return }
        setError("")
        submittingRef.current = true
        setSubmitting(true)
        onSubmittingChange(true)
        const common = {
            title: title.trim(),
            description: description.trim() || null,
            activityDate: new Date(`${activityDay}T${activityTime}`).toISOString(),
            status,
            priority,
        }
        try {
            const saved = mode === "create"
                ? await createActivity(common satisfies CreateActivityRequest, auth.token)
                : await updateActivity(auth.token, activity!.id, common satisfies UpdateActivityRequest)
            submittingRef.current = false
            setSubmitting(false)
            onSubmittingChange(false)
            onDirtyChange(false)
            onSaved(saved)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not save this activity. Please try again.")
        } finally {
            submittingRef.current = false
            setSubmitting(false)
            onSubmittingChange(false)
        }
    }

    return (
        <section className="activity-details activity-editor">
            <div className="details-topbar">
                <button className="details-back" type="button" onClick={onBack} disabled={submitting}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    {mode === "create" ? "Back to Activities" : "Back to Details"}
                </button>
                <div className="details-actions editor-actions">
                    <button type="button" className="details-delete editor-cancel" onClick={onBack} disabled={submitting}>Cancel</button>
                    <button type="submit" form="activity-editor-form" className="details-edit" disabled={submitting || !valid || (mode === "edit" && !dirty)} aria-busy={submitting}>
                        {submitting ? (mode === "create" ? "Creating…" : "Saving…") : (mode === "create" ? "Create Activity" : "Save Changes")}
                    </button>
                </div>
            </div>

            <form id="activity-editor-form" onSubmit={handleSubmit} noValidate>
                <header className="details-header">
                    <h1 className="editor-page-heading">{mode === "create" ? "Create Activity" : "Edit Activity"}</h1>
                    <div className="details-title-group">
                        <label className="editor-title-label" htmlFor="editor-title">Activity title
                            <input id="editor-title" className="editor-title-input" value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setFieldErrors(current => ({ ...current, title: "" })) }} required maxLength={100} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "editor-title-error" : undefined} />
                            {fieldErrors.title && <p className="field-error editor-field-error" id="editor-title-error" role="alert">{fieldErrors.title}</p>}
                        </label>
                        <div className={`editor-choice-field editor-status-field${openChoice === "status" ? " is-open" : ""}`}>
                            <label id="editor-status-label">Status</label>
                            <button type="button" id="editor-status" className="editor-choice-trigger" aria-labelledby="editor-status-label editor-status-value" aria-haspopup="listbox" aria-expanded={openChoice === "status"} onClick={() => setOpenChoice(openChoice === "status" ? null : "status")}>
                                <span id="editor-status-value">{getStatusLabel(status)}</span><ChevronDown size={16} aria-hidden="true" />
                            </button>
                            {openChoice === "status" && <div className="editor-choice-panel" role="listbox" aria-labelledby="editor-status-label">
                                {([1, 2, 3, 4] as ActivityStatus[]).map(value => <button type="button" role="option" aria-selected={status === value} className="editor-choice-option" key={value} onClick={() => { setStatus(value); setOpenChoice(null) }}>{getStatusLabel(value)}</button>)}
                            </div>}
                        </div>
                    </div>
                </header>

                {error && <p className="error-message editor-error" role="alert">{error}</p>}

                <div className="details-card">
                    <section className="details-section details-description-section">
                        <div className="details-section-heading">
                            <label htmlFor="editor-description">Description</label>
                        </div>
                        <textarea id="editor-description" className="editor-description" value={description} onChange={e => setDescription(e.target.value)} />
                    </section>
                    <div className="editor-choice-row">
                        <div className={`editor-choice-field editor-priority${openChoice === "priority" ? " is-open" : ""}`}>
                            <label id="editor-priority-label">Priority</label>
                            <button type="button" id="editor-priority" className="editor-choice-trigger" aria-labelledby="editor-priority-label editor-priority-value" aria-haspopup="listbox" aria-expanded={openChoice === "priority"} onClick={() => setOpenChoice(openChoice === "priority" ? null : "priority")}>
                                <span id="editor-priority-value">{getPriorityLabel(priority)}</span><ChevronDown size={16} aria-hidden="true" />
                            </button>
                            {openChoice === "priority" && <div className="editor-choice-panel" role="listbox" aria-labelledby="editor-priority-label">
                                {([1, 2, 3] as ActivityPriority[]).map(value => <button type="button" role="option" aria-selected={priority === value} className="editor-choice-option" key={value} onClick={() => { setPriority(value); setOpenChoice(null) }}>{getPriorityLabel(value)}</button>)}
                            </div>}
                        </div>
                    </div>
                    <dl className="details-metadata editor-metadata">
                        <div className="details-metadata-item">
                            <dt><CalendarDays size={15} aria-hidden="true" />Activity date</dt>
                            <dd><CustomDatePicker value={activityDay} onChange={value => { setActivityDay(value); setFieldErrors(current => ({ ...current, activityDay: "" })) }} /></dd>
                            {fieldErrors.activityDay && <p className="field-error editor-field-error" role="alert">{fieldErrors.activityDay}</p>}
                        </div>
                        <div className="details-metadata-item">
                            <dt><CalendarClock size={15} aria-hidden="true" />Activity time</dt>
                            <dd><CustomTimePicker value={activityTime} onChange={value => { setActivityTime(value); setFieldErrors(current => ({ ...current, activityTime: "" })) }} /></dd>
                            {fieldErrors.activityTime && <p className="field-error editor-field-error" role="alert">{fieldErrors.activityTime}</p>}
                        </div>
                        {mode === "edit" && activity && <>
                            <div className="details-metadata-item"><dt><CalendarPlus size={15} aria-hidden="true" />Created</dt><dd>{displayDate(activity.createdAt)}</dd></div>
                            <div className="details-metadata-item"><dt><CalendarClock size={15} aria-hidden="true" />Last updated</dt><dd>{activity.updatedAt ? displayDate(activity.updatedAt) : "Never updated"}</dd></div>
                        </>}
                    </dl>
                </div>
                <span className="sr-only">{getStatusLabel(status)} status, {getPriorityLabel(priority)} priority</span>
            </form>
        </section>
    )
}

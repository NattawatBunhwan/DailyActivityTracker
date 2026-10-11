import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react"
import type { Activity, ActivityPriority, ActivityStatus, UpdateActivityRequest } from "../types/activity"
import useAuth from "../hooks/useAuth"
import { updateActivity } from "../api/activityApi"
import "./ActivityForm.css"

type EditActivityFormProps = {
    activity: Activity
    onActivityUpdated: () => void
    onUnsavedChangesChange: (hasChanges: boolean) => void
}

function toLocalDateTimeString(dateString: string): string {
    const date = new Date(dateString)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1 ).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")

    return `${year}-${month}-${day}T${hours}:${minutes}`
}

function EditActivityForm({ activity, onActivityUpdated, onUnsavedChangesChange }: EditActivityFormProps) {
    const [title, setTitle] = useState(activity.title)
    const initialTitle = useRef(activity.title)
    const [description, setDescription] = useState(activity.description ?? "")
    const initialDescription = useRef(activity.description ?? "")
    const [activityDate, setActivityDate] = useState(toLocalDateTimeString(activity.activityDate))
    const initialActivityDate = useRef(toLocalDateTimeString(activity.activityDate))
    const [status, setStatus] = useState(activity.status)
    const initialStatus = useRef(activity.status)
    const [priority, setPriority] = useState(activity.priority)
    const initialPriority = useRef(activity.priority)
    const auth = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    function checkHasUnsavedChanges(
        newTitle: string = title,
        newDescription: string = description,
        newActivityDate: string = activityDate,
        newStatus: ActivityStatus = status,
        newPriority: ActivityPriority = priority
    ) {
        return (
            newTitle !== initialTitle.current ||
            newDescription !== initialDescription.current ||
            newActivityDate !== initialActivityDate.current ||
            newStatus !== initialStatus.current ||
            newPriority !== initialPriority.current
        )
    }

    const hasUnsavedChanges = checkHasUnsavedChanges()

    return (
        <form className="activity-form" onSubmit={handleSubmit}>
            <h2>Edit Activity</h2>
            {errorMessage && (<p>{errorMessage}</p>)}

            <div className="activity-form__field">
                <label htmlFor="edit-title">Title</label>
                <input 
                    type="text"
                    value={title}
                    id="edit-title"
                    onChange={(e) => {
                        const newTitle = e.target.value

                        setTitle(newTitle)
                        onUnsavedChangesChange(
                            checkHasUnsavedChanges(newTitle)
                        )
                    }}
                    required
                />
            </div>

            <div className="activity-form__field">
                <label htmlFor="edit-description">Description</label>
                <textarea
                    name="description"
                    value={description}
                    id="edit-description"
                    onChange={(e) => {
                        const newDescription = e.target.value

                        setDescription(newDescription)
                        onUnsavedChangesChange(
                            checkHasUnsavedChanges(
                                title,
                                newDescription
                            )
                        )
                    }}
                ></textarea>
            </div>

            <div className="activity-form__row">
                <div className="activity-form__field">
                    <label htmlFor="edit-activityDate">Activity Date</label>
                    <input 
                        type="datetime-local"
                        value={activityDate}
                        id="edit-activityDate"
                        onChange={(e) => {
                            const newActivityDate = e.target.value

                            setActivityDate(newActivityDate)
                            onUnsavedChangesChange(
                                checkHasUnsavedChanges(
                                    title,
                                    description,
                                    newActivityDate
                                )
                            )
                        }}
                        required
                    />
                </div>

                <div className="activity-form__field">
                    <label htmlFor="edit-status">Status</label>
                    <select 
                        name="status"
                        value={status}
                        onChange={handleStatusChange} 
                        id="edit-status"
                        >
                            <option value="1">Pending</option>
                            <option value="2">In Progress</option>
                            <option value="3">Completed</option>
                            <option value="4">Cancelled</option>
                    </select>
                </div>

                <div className="activity-form__field">
                    <label htmlFor="edit-priority">Priority</label>
                    <select 
                        name="priority" 
                        value={priority}
                        onChange={handlePriorityChange}
                        id="edit-priority"
                        >
                            <option value="1">Low</option>
                            <option value="2">Medium</option>
                            <option value="3">High</option>
                    </select>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={!hasUnsavedChanges || isLoading}
            >
                {isLoading ? "Updating..." : "Update"}
            </button>
        </form>
    )

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!auth.token) {
            setErrorMessage("User is not authenticated")
            return;
        }

        setErrorMessage("")
        setIsLoading(true)

        const updateRequest: UpdateActivityRequest = {
            title: title.trim(),
            description: description.trim(),
            activityDate: activityDate,
            status: status,
            priority: priority,
        }

        try {
            const updateData = await updateActivity(auth.token, activity.id, updateRequest)

            onActivityUpdated()
            onUnsavedChangesChange(false)

            console.log("Update activity success:",updateData)

            setErrorMessage("")
        } catch (error) {
            console.error("Fail update activity:",error)
            setErrorMessage("Failed to update activity.")
        } finally {
            setIsLoading(false)
        }
    }

    function isValidStatus(value: number): value is ActivityStatus {
            switch (value) {
                case 1:
                case 2:
                case 3:
                case 4:
                    return true
                default:
                    return false;
            }
        }
    
    function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
        const newStatus = Number(event.target.value)
    
        if (isValidStatus(newStatus)) {
            setStatus(newStatus)

            onUnsavedChangesChange(
                checkHasUnsavedChanges(
                    title,
                    description,
                    activityDate,
                    newStatus
                )
            )
        }
    }

    function isValidPriority(value: number): value is ActivityPriority {
        switch (value) {
            case 1:
            case 2:
            case 3:
                return true
            default:
                return false;
        }
    }
    
    function handlePriorityChange(event: ChangeEvent<HTMLSelectElement>) {
        const newPriority = Number(event.target.value)
    
        if (isValidPriority(newPriority)) {
            setPriority(newPriority)

            onUnsavedChangesChange(
                checkHasUnsavedChanges(
                    title,
                    description,
                    activityDate,
                    status,
                    newPriority
                )
            )
        }
    }
}

export default EditActivityForm

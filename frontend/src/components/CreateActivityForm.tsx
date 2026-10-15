import { useState, type ChangeEvent, type SubmitEvent } from "react"
import type { Activity, ActivityPriority, ActivityStatus, CreateActivityRequest } from "../types/activity"
import { createActivity } from "../api/activityApi"
import useAuth from "../hooks/useAuth"
import "./ActivityForm.css"

type CreateActivityFormProps = {
    onActivityCreated: (createData: Activity) => void
    onCreatingChange: (isCreating: boolean) => void
}

type CreateActivityFormData = {
    title: string
    description: string
    activityDate: string
    status: ActivityStatus
    priority: ActivityPriority
}

function CreateActivityForm({ onActivityCreated, onCreatingChange }: CreateActivityFormProps) {
    const [formData, setFormData] = useState<CreateActivityFormData>({
        title: "",
        description: "",
        activityDate: "",
        status: 1,
        priority: 1,
    })
    const auth = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    return (
        <form className="activity-form" onSubmit={handleSubmit}>
            <header>
                <h2 id="create-modal-title">Create Activity</h2>
                {errorMessage && (
                    <p className="error-message" role="alert">{errorMessage}</p>
                )}
            </header>

            <div className="activity-form__field">
                <label htmlFor="title">Title</label>
                <input 
                    type="text" 
                    value={formData.title} 
                    onChange={event => setFormData({...formData, title: event.target.value})} 
                    id="title"
                    required
                />
            </div>

            <div className="activity-form__field">
                <label htmlFor="description">Description</label>
                <textarea 
                    name="description"
                    value={formData.description}
                    onChange={event => setFormData({...formData, description: event.target.value})}
                    id="description"
                ></textarea>
            </div>

            <div className="activity-form__row">
                <div className="activity-form__field">
                    <label htmlFor="activityDate">Activity Date</label>
                    <input 
                        type="datetime-local"
                        value={formData.activityDate}
                        onChange={event => setFormData({...formData, activityDate: event.target.value})}
                        id="activityDate"
                        required
                    />
                </div>

                <div className="activity-form__field">
                    <label htmlFor="status">Status</label>
                    <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleStatusChange}
                        id="status"
                        >
                            <option value="1">Pending</option>
                            <option value="2">In Progress</option>
                            <option value="3">Completed</option>
                            <option value="4">Cancelled</option>
                    </select>
                </div>

                <div className="activity-form__field">
                    <label htmlFor="priority">Priority</label>
                    <select 
                        name="priority"
                        value={formData.priority}
                        onChange={handlePriorityChange}
                        id="priority"
                        >
                            <option value="1">Low</option>
                            <option value="2">Medium</option>
                            <option value="3">High</option>
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
            >
                {isLoading ? "Creating..." : "Create"}
            </button>
            
        </form>
    )

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isLoading) {
            return
        }

        if (!auth.token) {
            setErrorMessage("User is not authenticated")
            return;
        }

        setErrorMessage("")
        setIsLoading(true)
        onCreatingChange(true)

        const request: CreateActivityRequest = {
            title: formData.title.trim(),
            description: formData.description.trim() === "" ? null : formData.description.trim(),
            activityDate: new Date(formData.activityDate).toISOString(),
            status: formData.status,
            priority: formData.priority,
        };

        try {
            const createData = await createActivity(request, auth.token)

            onActivityCreated(createData)

            setErrorMessage("")
        } catch (error) {
            console.error("Fail create activity:",error)
            setErrorMessage(
                error instanceof Error ? error.message : "Failed to create activity."
            )
        } finally {
            setIsLoading(false)
            onCreatingChange(false)
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
        const value = Number(event.target.value)

        if (isValidStatus(value)) {
            setFormData({...formData, status: value})
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
        const value = Number(event.target.value)

        if (isValidPriority(value)) {
            setFormData({...formData, priority: value})
        }
    }
}


export default CreateActivityForm

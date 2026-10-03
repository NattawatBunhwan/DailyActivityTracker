import { useState, type ChangeEvent, type SubmitEvent } from "react"
import type { ActivityPriority, ActivityStatus, CreateActivityRequest } from "../types/activity"
import { createActivity } from "../api/activityApi"
import useAuth from "../hooks/useAuth"

type CreateActivityFormProps = {
    onActivityCreated: () => void
}

type CreateActivityFormData = {
    title: string
    description: string
    activityDate: string
    status: ActivityStatus
    priority: ActivityPriority
}

function CreateActivityForm({ onActivityCreated }: CreateActivityFormProps) {
    const [formData, setFormData] = useState<CreateActivityFormData>({
        title: "",
        description: "",
        activityDate: "",
        status: 1,
        priority: 1,
    })
    const auth = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create Activity</h2>
            {successMessage && (<p>{successMessage}</p>)}
            {errorMessage && (<p>{errorMessage}</p>)}

            <label htmlFor="title">Title</label>
            <input 
                type="text" 
                value={formData.title} 
                onChange={event => setFormData({...formData, title: event.target.value})} 
                id="title"
                required
            />

            <label htmlFor="description">Description</label>
            <textarea 
                name="description"
                value={formData.description}
                onChange={event => setFormData({...formData, description: event.target.value})}
                id="description"
            ></textarea>

            <label htmlFor="activityDate">Activity Date</label>
            <input 
                type="datetime-local"
                value={formData.activityDate}
                onChange={event => setFormData({...formData, activityDate: event.target.value})}
                id="activityDate"
                required
            />

            <label htmlFor="status">Status</label>
            <select 
                name="status" 
                value={formData.status} 
                onChange={handleStatusChange}
                id="status"
                >
                    <option value="1">Pending</option>
                    <option value="2">InProgress</option>
                    <option value="3">Completed</option>
                    <option value="4">Cancelled</option>
            </select>

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

            <button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create"}</button>
            
        </form>
    )

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!auth.token) {
            setErrorMessage("User is not authenticated")
            return;
        }

        setSuccessMessage("")
        setErrorMessage("")
        setIsLoading(true)

        const request: CreateActivityRequest = {
            title: formData.title.trim(),
            description: formData.description.trim() === "" ? null : formData.description.trim(),
            activityDate: formData.activityDate,
            status: formData.status,
            priority: formData.priority,
        };

        console.log("Ready to send data to API:",request)

        try {
            const createData = await createActivity(request, auth.token)

            onActivityCreated()

            console.log("Create activity success:",createData)

            setSuccessMessage("Activity created successfully!")
            setErrorMessage("")
            setFormData({
                title: "",
                description: "",
                activityDate: "",
                status: 1,
                priority: 1,
            })
        } catch (error) {
            console.error("Fail create activity:",error)
            setErrorMessage("Failed to create activity.")
            setSuccessMessage("")
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
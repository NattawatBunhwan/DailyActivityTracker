import type { Activity } from "../types/activity"

type CreatedActivityFormProps = {
    activityCreated: Activity
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

function CreatedActivityForm({ activityCreated }: CreatedActivityFormProps) {
    return (
        <form>
            <header>
                <h2>Activity Create Success</h2>
            </header>

            <label htmlFor="title">Title</label>
            <input 
                type="text" 
                value={activityCreated.title}
                id="title"
                readOnly
            />

            <label htmlFor="description">Description</label>
            <textarea 
                name="description"
                value={activityCreated.description ?? ""}
                id="description"
                readOnly
            ></textarea>

            <label htmlFor="activityDate">Activity Date</label>
            <input 
                type="datetime-local"
                value={toLocalDateTimeString(activityCreated.activityDate)}
                id="activityDate"
                readOnly
            />

            <label htmlFor="status">Status</label>
            <select 
                name="status" 
                value={activityCreated.status}
                id="status"
                disabled
                >
                    <option value="1">Pending</option>
                    <option value="2">In Progress</option>
                    <option value="3">Completed</option>
                    <option value="4">Cancelled</option>
            </select>

            <label htmlFor="priority">Priority</label>
            <select 
                name="priority"
                value={activityCreated.priority}
                id="priority"
                disabled 
                >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
            </select>
        </form>
    )
}

export default CreatedActivityForm
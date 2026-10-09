import type { Activity } from "../types/activity"
import { getPriorityLabel, getStatusLabel } from "../utils/activity"

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
        <section>
            <header>
                <h2>Activity Create Success</h2>
            </header>

            <div>
                <label htmlFor="created-activity-title">Title</label>
                <input 
                    type="text" 
                    value={activityCreated.title}
                    id="created-activity-title"
                    readOnly
                />
            </div>

            <div>
                <label htmlFor="created-activity-description">Description</label>
                <textarea 
                    value={activityCreated.description ?? ""}
                    id="created-activity-description"
                    readOnly
                ></textarea>
            </div>

            <div>
                <label htmlFor="created-activity-date">Activity Date</label>
                <input 
                    type="datetime-local"
                    value={toLocalDateTimeString(activityCreated.activityDate)}
                    id="created-activity-date"
                    readOnly
                />
            </div>

            <div>
                <label htmlFor="created-activity-status">Status</label>
                <input 
                    type="text"
                    value={getStatusLabel(activityCreated.status)}
                    id="created-activity-status"
                    readOnly
                />
            </div>

            <div>
                <label htmlFor="created-activity-priority">Priority</label>
                <input 
                    type="text"
                    value={getPriorityLabel(activityCreated.priority)}
                    id="created-activity-priority"
                    readOnly
                />
            </div>
        </section>
    )
}

export default CreatedActivityForm
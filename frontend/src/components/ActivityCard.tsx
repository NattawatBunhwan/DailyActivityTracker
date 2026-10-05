import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"

type ActivityCardProps = {
    activity: Activity
    onEdit: (activityId: string) => void
    onDelete: (activityId: string) => void
    isDeleting: boolean
}

function ActivityCard({ activity, onEdit, onDelete, isDeleting }: ActivityCardProps) {
    return (
        <div>
            <h2>{activity.title}</h2>
            <p>Status: {getStatusLabel(activity.status)}</p>
            <p>Priority: {getPriorityLabel(activity.priority)}</p>

            <button onClick={() => onEdit(activity.id)}>
                Edit
            </button>

            <button 
                onClick={() => onDelete(activity.id)}
                disabled={isDeleting}
            >
                {isDeleting ? "Deleting..." : "Delete"}
            </button>
        </div>
    )
}

export default ActivityCard
import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"

type ActivityCardProps = {
    activity: Activity
    onEdit: (activityId: string) => void
}

function ActivityCard({ activity, onEdit }: ActivityCardProps) {
    return (
        <div>
            <h2>{activity.title}</h2>
            <p>Status: {getStatusLabel(activity.status)}</p>
            <p>Priority: {getPriorityLabel(activity.priority)}</p>

            <button onClick={() => onEdit(activity.id)}>
                Edit
            </button>
        </div>
    )
}

export default ActivityCard
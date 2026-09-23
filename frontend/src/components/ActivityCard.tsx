import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"

type ActivityCardProps = {
    activity: Activity
}

function ActivityCard({ activity }: ActivityCardProps) {
    return (
        <div>
            <h2>{activity.title}</h2>
            <p>Status: {getStatusLabel(activity.status)}</p>
            <p>Priority: {getPriorityLabel(activity.priority)}</p>
        </div>
    )
}

export default ActivityCard
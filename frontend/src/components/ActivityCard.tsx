import type { Activity } from "../types/activity"

type ActivityCardProps = {
    activity: Activity
}

function ActivityCard({ activity }: ActivityCardProps) {
    return (
        <div>
            <h2>{activity.title}</h2>
            <p>Priorty: {activity.priority}</p>
            <p>Status: {activity.status}</p>
        </div>
    )
}

export default ActivityCard
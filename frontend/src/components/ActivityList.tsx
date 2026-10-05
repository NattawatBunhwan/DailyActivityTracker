import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"

type ActivityListProps = {
    activities: Activity[]
    onEdit: (activityId: string) => void
    onDelete: (activityId: string) => void
    isDeleting: boolean
}

function ActivityList({ activities, onEdit, onDelete ,isDeleting}:ActivityListProps) {
    return (
        <div>
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                />
            ))}
        </div>
    )
}

export default ActivityList
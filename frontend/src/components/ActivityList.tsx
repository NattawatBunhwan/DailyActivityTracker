import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"

type ActivityListProps = {
    activities: Activity[]
    onEdit: (activityId: string) => void
}

function ActivityList({ activities, onEdit }:ActivityListProps) {
    return (
        <div>
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={onEdit}
                />
            ))}
        </div>
    )
}

export default ActivityList
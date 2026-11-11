import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"
import "./ActivityList.css"

type ActivityListProps = {
    activities: Activity[]
    onViewDetails: (activityId: string) => void
}

function ActivityList({ activities, onViewDetails}:ActivityListProps) {
    return (
        <div className="activity-list">
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onViewDetails={onViewDetails}
                />
            ))}
        </div>
    )
}

export default ActivityList

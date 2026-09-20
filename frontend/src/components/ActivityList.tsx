import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"

type ActivityListProps = {
    activities: Activity[]
}

function ActivityList({ activities }:ActivityListProps) {
    return (
        <div>
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                />
            ))}
        </div>
    )
}

export default ActivityList
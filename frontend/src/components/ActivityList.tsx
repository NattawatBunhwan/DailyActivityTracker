import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"

type ActivityListProps = {
    activities: Activity[]
    onEdit: (activityId: string) => void
    onEditButtonClick: (button: HTMLButtonElement, activityId: string) => void
    onDelete: (button: HTMLButtonElement, activityId: string) => void
    isDeleting: boolean
}

function ActivityList({ activities, onEdit, onEditButtonClick, onDelete ,isDeleting}:ActivityListProps) {
    return (
        <div>
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={onEdit}
                    onEditButtonClick={onEditButtonClick}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                />
            ))}
        </div>
    )
}

export default ActivityList

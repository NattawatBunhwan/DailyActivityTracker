import type { Activity } from "../types/activity";
import ActivityCard from "./ActivityCard"
import "./ActivityList.css"

type ActivityListProps = {
    activities: Activity[]
    onEdit: (activityId: string) => void
    onEditButtonClick: (button: HTMLButtonElement, activityId: string) => void
    onDelete: (button: HTMLButtonElement, activityId: string) => void
    onViewDetails: (activityId: string) => void
    isDeleting: boolean
}

function ActivityList({ activities, onEdit, onEditButtonClick, onDelete, onViewDetails, isDeleting}:ActivityListProps) {
    return (
        <div className="activity-list">
            {activities.map((activity) => (
                <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={onEdit}
                    onEditButtonClick={onEditButtonClick}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    isDeleting={isDeleting}
                />
            ))}
        </div>
    )
}

export default ActivityList

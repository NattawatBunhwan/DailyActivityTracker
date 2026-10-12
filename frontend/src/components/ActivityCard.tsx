import type React from "react"
import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"

type ActivityCardProps = {
    activity: Activity
    onEdit: (activityId: string) => void
    onEditButtonClick: (button: HTMLButtonElement, activityId: string) => void
    onDelete: (activityId: string) => void
    isDeleting: boolean
}

function ActivityCard({ activity, onEdit, onEditButtonClick, onDelete, isDeleting }: ActivityCardProps) {
    return (
        <div>
            <h2>{activity.title}</h2>
            <p>Status: {getStatusLabel(activity.status)}</p>
            <p>Priority: {getPriorityLabel(activity.priority)}</p>

            <button
                className="activity-edit-button"
                data-activity-id={activity.id}
                data-action="edit"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    onEditButtonClick(event.currentTarget, activity.id)
                    onEdit(activity.id)          
                }}
            >
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
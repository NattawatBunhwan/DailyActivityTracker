import type React from "react"
import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"

type ActivityCardProps = {
    activity: Activity
    onEdit: (activityId: string) => void
    onEditButtonClick: (button: HTMLButtonElement, activityId: string) => void
    onDelete: (button: HTMLButtonElement, activityId: string) => void
    isDeleting: boolean
}

function ActivityCard({ activity, onEdit, onEditButtonClick, onDelete, isDeleting }: ActivityCardProps) { 
    return (
        <article className="activity-card">
            <div className="activity-card-content">
                <div className="activity-card-heading">
                    <div className="activity-card-main">
                        <h3 className="activity-card-title">
                            {activity.title}
                        </h3>

                        {activity.description && (
                            <p className="activity-card-description">
                                {activity.description}
                            </p>
                        )}
                    </div>

                    <span
                        className={`activity-status status-${getStatusLabel(
                            activity.status
                        )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                    >
                        {getStatusLabel(activity.status)}
                    </span>
                </div>

                <div className="activity-card-meta">
                    <span className={`activity-priority priority-${getPriorityLabel(activity.priority).toLowerCase()}`}
                    >
                        {getPriorityLabel(activity.priority)} Priority
                    </span>

                    <time className="activity-card-date">
                        Activity date:{" "}
                        {new Date(activity.activityDate).toLocaleDateString(
                            "en-GB",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                            }
                        )}
                    </time>
                </div>
            </div>

            <div className="activity-card-footer">
                <div className="activity-card-actions">
                    <button
                        type="button"
                        className="activity-edit-button"
                        data-activity-id={activity.id}
                        data-action="edit"
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            onEditButtonClick(event.currentTarget, activity.id);
                            onEdit(activity.id);
                        }}
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        className="activity-delete-button"
                        aria-label={`Delete ${activity.title}`}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
                            onDelete(event.currentTarget, activity.id)
                        }
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </article>
    )
}

export default ActivityCard

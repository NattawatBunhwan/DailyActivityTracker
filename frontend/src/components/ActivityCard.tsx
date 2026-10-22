import type { Activity } from "../types/activity"
import { getStatusLabel, getPriorityLabel } from "../utils/activity"
import { CalendarDays } from "lucide-react"
import "./ActivityCard.css"

type ActivityCardProps = {
    activity: Activity
    onViewDetails: (activityId: string) => void
}

function ActivityCard({ activity, onViewDetails }: ActivityCardProps) {
    return (
        <article
            className="activity-card activity-card--clickable"
            role="link"
            tabIndex={0}
            aria-label={`View details for ${activity.title}`}
            onClick={() => onViewDetails(activity.id)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onViewDetails(activity.id)
                }
            }}
        >
            <div className="activity-card-content">
                <div className="activity-card-heading">
                    <div className="activity-card-main">
                        <h3 className="activity-card-title">
                            {activity.title}
                        </h3>

                        <p className="activity-card-description">
                            {activity.description?.trim() || "No description provided."}
                        </p>
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
                        <CalendarDays size={14} aria-hidden="true" />
                        <span>
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
                        </span>
                    </time>
                </div>
            </div>

        </article>
    )
}

export default ActivityCard

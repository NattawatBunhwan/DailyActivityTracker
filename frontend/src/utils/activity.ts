import type { ActivityStatus, ActivityPriority } from "../types/activity";

export function getStatusLabel(status: ActivityStatus) {
    switch (status) {
        case 1:
            return "Pending"
        case 2:
            return "InProgress"
        case 3:
            return "Completed"
        case 4:
            return "Cancelled"
        default:
            return "Unknown"
    }
}

export function getPriorityLabel(priority: ActivityPriority) {
    switch (priority) {
        case 1:
            return "Low"
        case 2:
            return "Medium"
        case 3:
            return "High"
        default:
            return "Unknown"
    }
}
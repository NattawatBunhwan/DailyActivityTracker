export type ActivityStatus = 
    | 'Pending'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled'

export type ActivityPriority =
    | 'Low'
    | 'Medium'
    | 'High'

export type Activity = {
    id: number
    title: string
    priority: ActivityPriority
    status: ActivityStatus
}
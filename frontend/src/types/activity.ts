export type ActivityStatus = 
    | 1 //'Pending'
    | 2 //'InProgress'
    | 3 //'Completed'
    | 4 //'Cancelled'

export type ActivityPriority =
    | 1 //'Low'
    | 2 //'Medium'
    | 3 //'High'

export type Activity = {
    id: string
    userId: string
    title: string
    description: string | null
    activityDate: string
    status: ActivityStatus
    priority: ActivityPriority
}

export type CreateActivityRequest = {
    title: string
    description: string | null
    activityDate: string
    status: ActivityStatus
    priority: ActivityPriority
}

export type UpdateActivityRequest = {
    title: string
    description: string | null
    activityDate: string
    status: ActivityStatus
    priority: ActivityPriority
}

export type ActivitiesResponse = {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    items: Activity[]
}
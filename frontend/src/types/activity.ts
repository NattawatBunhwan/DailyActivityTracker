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

export type PagedResponse<T> = {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    items: T[]
}

export type ActivitiesResponse = {
    activities: PagedResponse<Activity>
    availableStatuses: ActivityStatus[]
    availablePriorities: ActivityPriority[]
}

export type ActivityQuery = {
    page?: number
    pageSize?: number
    status?: ActivityStatus
    priority?: ActivityPriority
    search?: string
    sortBy?: string
    descending?: boolean
}

export type ActivitySummary = {
    totalActivities: number
    pendingCount: number
    inProgressCount: number
    completedCount: number
}

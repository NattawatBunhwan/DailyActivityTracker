import type { Activity, ActivitiesResponse, CreateActivityRequest, UpdateActivityRequest, ActivityQuery, ActivitySummary } from "../types/activity"
import { handleApiError } from "./apiError"

// Activity API Functions
export async function createActivity(request: CreateActivityRequest, token: string): Promise<Activity> {
    const response = await fetch('https://localhost:7127/api/Activities', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
    })

    await handleApiError(response, "Failed to create activity.")

    const data: Activity = await response.json()
    
    return data
}


export async function getActivities(token: string, query: ActivityQuery = {}): Promise<ActivitiesResponse> {
    const params = new URLSearchParams()

    params.set('Page', String(query.page ?? 1))
    params.set('PageSize', String(query.pageSize ?? 10))

    if (query.status !== undefined) {
        params.set('Status', String(query.status))
    }

    if (query.priority !== undefined) {
        params.set('Priority', String(query.priority))
    }

    if (query.search?.trim()) {
        params.set('Search', query.search.trim())
    }

    if (query.sortBy) {
        params.set('SortBy', query.sortBy)
        params.set('Descending', String(query.descending ?? false))
    }

    const response = await fetch(
        `https://localhost:7127/api/Activities?${params.toString()}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    )

    await handleApiError(response, "Failed to load activities.")

    const data: ActivitiesResponse = await response.json()

    return data
}

export async function getActivityById(token: string, id: string): Promise<Activity> {
    const response = await fetch(`https://localhost:7127/api/Activities/${id}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        }
    })

    await handleApiError(response, "Failed to load activity.")

    const data: Activity = await response.json()

    return data
}

export async function updateActivity(token: string, activityId: string, request: UpdateActivityRequest): Promise<Activity> {
    const response = await fetch(`https://localhost:7127/api/Activities/${activityId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
    })
    
    await handleApiError(response, "Failed to edit activity.")

    const data: Activity = await response.json()
    
    return data
}

export async function deleteActivity(token: string, activityId: string): Promise<void> {
    let response: Response
    try {
        response = await fetch(`https://localhost:7127/api/Activities/${activityId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
    } catch {
        throw new Error("Unable to connect to the server. Please check your internet connection and try again.")
    }

    await handleApiError(response, "Failed to delete activity.")
}

export async function getActivitySummary(token: string): Promise<ActivitySummary> {
    const response = await fetch('https://localhost:7127/api/Activities/summary', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        },
    })

    await handleApiError(response, "Failed to load activity summary.")

    const data: ActivitySummary = await response.json()

    return data
}

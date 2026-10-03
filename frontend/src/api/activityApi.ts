import type { Activity, ActivitiesResponse, CreateActivityRequest, UpdateActivityRequest } from "../types/activity"

type ApiErrorResponse = {
    title?: string
    status?: number
    errors?: Record<string, string[]>
}

// Shared Error Handler
async function handleApiError(response: Response, fallbackMessage: string): Promise<void> {
    if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()

        const errorMessages = Object.values(errorData.errors ?? {}).flat().join(" ")

        throw new Error(errorMessages || errorData.title || fallbackMessage)
    }
}

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

export async function getActivities(token: string, page: number): Promise<ActivitiesResponse> {
    const response = await fetch(`https://localhost:7127/api/Activities?page=${page}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

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
    const response = await fetch(`https://localhost:7127/api/Activities/${activityId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    await handleApiError(response, "Failed to delete activity.")
}
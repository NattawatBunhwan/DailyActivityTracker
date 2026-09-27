import type { Activity, ActivitiesResponse, CreateActivityRequest, UpdateActivityRequest } from "../types/activity"

export async function createActivity(request: CreateActivityRequest, token: string): Promise<Activity> {
    const response = await fetch('https://localhost:7127/api/Activities', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
    })

    if (!response.ok) {
        throw new Error('Failed to create activity.')
    }

    const data: Activity = await response.json()
    
    return data
}

export async function getActivities(token: string): Promise<ActivitiesResponse> {
    const response = await fetch('https://localhost:7127/api/Activities', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!response.ok) {
        throw new Error('Failed to load activities.')
    }

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
    
    if (!response.ok) {
        throw new Error('Failed to load activity.')
    }

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
    
    if (!response.ok) {
        throw new Error('Failed to edit activity.')
    }

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
    
    if (!response.ok) {
        throw new Error("Failed to delete activity.")
    }
}
import type { Activity } from "../types/activity"

type ActivitiesResponse = {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    items: Activity[]
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

type ApiErrorResponse = {
    title?: string
    message?: string
    status?: number
    errors?: Record<string, string[]>
}

// Shared Error Handler
export async function handleApiError(response: Response, fallbackMessage: string): Promise<void> {
    if (!response.ok) {
        let errorData: ApiErrorResponse = {}
        try { errorData = await response.json() as ApiErrorResponse } catch { /* Empty error response. */ }

        const errorMessages = Object.values(errorData.errors ?? {}).flat().join(" ")

        const error = new Error(errorMessages || errorData.message || errorData.title || fallbackMessage) as Error & { status: number }
        error.status = response.status
        throw error
    }
}

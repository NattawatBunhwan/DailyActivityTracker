type ApiErrorResponse = {
    title?: string
    message?: string
    status?: number
    errors?: Record<string, string[]>
}

// Shared Error Handler
export async function handleApiError(response: Response, fallbackMessage: string): Promise<void> {
    if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()

        const errorMessages = Object.values(errorData.errors ?? {}).flat().join(" ")

        throw new Error(errorMessages || errorData.message || errorData.title || fallbackMessage)
    }
}

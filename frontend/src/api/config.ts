const DEFAULT_API_BASE_URL = "https://localhost:7127"

export function resolveApiBaseUrl(
    envValue?: string,
    isProduction: boolean = import.meta.env.PROD
): string {
    const trimmed = envValue?.trim()

    if (isProduction) {
        if (trimmed === undefined || trimmed === null) {
            throw new Error(
                "Missing required environment variable: VITE_API_BASE_URL. In Production builds, an explicit backend API URL must be provided."
            )
        }
        // If an empty string or relative root "/" is provided in production, use same-origin relative base URL ""
        if (trimmed === "" || trimmed === "/") {
            return ""
        }
        return trimmed.replace(/\/+$/, "")
    }

    return (trimmed && trimmed !== "" ? trimmed : DEFAULT_API_BASE_URL).replace(/\/+$/, "")
}

export const API_BASE_URL = resolveApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL
)

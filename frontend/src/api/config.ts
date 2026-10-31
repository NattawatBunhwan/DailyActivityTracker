const DEFAULT_API_BASE_URL = "https://localhost:7127"

export function resolveApiBaseUrl(envValue?: string): string {
    return (envValue && envValue.trim() !== ""
        ? envValue
        : DEFAULT_API_BASE_URL
    ).replace(/\/+$/, "")
}

export const API_BASE_URL = resolveApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL
)

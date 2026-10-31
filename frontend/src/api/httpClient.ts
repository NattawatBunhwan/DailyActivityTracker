import { refreshAccessToken } from "./authApi"

type AuthSessionResponse = {
    token: string
    expiresAt: string
    refreshToken: string
}

type AuthSessionCallbacks = {
    getRefreshToken: () => string
    onSessionRefreshed: (data: AuthSessionResponse) => void
    onSessionExpired: () => void
}

let sessionCallbacks: AuthSessionCallbacks | null = null
let latestAccessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAuthSessionCallbacks(callbacks: AuthSessionCallbacks | null): void {
    sessionCallbacks = callbacks
}

export function setLatestAccessToken(token: string | null): void {
    latestAccessToken = token
}

export function getLatestAccessToken(): string | null {
    return latestAccessToken
}

function clearSession(): void {
    latestAccessToken = null
    refreshPromise = null
    if (sessionCallbacks) {
        sessionCallbacks.onSessionExpired()
    }
}

async function requestTokenRefresh(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise
    }

    const currentRefreshToken = sessionCallbacks?.getRefreshToken()
    if (!currentRefreshToken) {
        clearSession()
        return null
    }

    refreshPromise = (async () => {
        try {
            const data = await refreshAccessToken(currentRefreshToken)
            latestAccessToken = data.token
            if (sessionCallbacks) {
                sessionCallbacks.onSessionRefreshed(data)
            }
            return data.token
        } catch {
            clearSession()
            return null
        } finally {
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export async function authenticatedFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
    initialToken?: string
): Promise<Response> {
    const effectiveToken = latestAccessToken || initialToken

    const headers = new Headers(init.headers || {})
    if (effectiveToken) {
        headers.set("Authorization", `Bearer ${effectiveToken}`)
    }

    const requestInit: RequestInit = {
        ...init,
        headers,
    }

    const response = await fetch(input, requestInit)

    if (response.status === 401) {
        const isRetry = (init as { _isRetry?: boolean })._isRetry

        if (isRetry) {
            clearSession()
            return response
        }

        const newToken = await requestTokenRefresh()
        if (!newToken) {
            return response
        }

        const retryHeaders = new Headers(init.headers || {})
        retryHeaders.set("Authorization", `Bearer ${newToken}`)

        const retryInit: RequestInit & { _isRetry: boolean } = {
            ...init,
            headers: retryHeaders,
            _isRetry: true,
        }

        const retryResponse = await fetch(input, retryInit)
        if (retryResponse.status === 401) {
            clearSession()
        }

        return retryResponse
    }

    return response
}

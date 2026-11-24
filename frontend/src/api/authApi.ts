import { handleApiError } from "./apiError"
import { API_BASE_URL } from "./config"

type LoginRequest = {
    email: string
    password: string
}

export type AuthResponse = {
    token: string
    expiresAt: string
}

type RegisterRequest = {
    email: string
    password: string
    firstName: string
    lastName: string
    age: number
    occupation: string
}

type RegisterResponse = {
    id: string
    firstName: string
    lastName: string
    age: number
    occupation: string
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
    })

    await handleApiError(response, 'Registration failed')

    const data: RegisterResponse = await response.json()

    return data
}

export async function login({ email, password }: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            email,
            password,
        })
    })

    await handleApiError(response, 'Login failed')

    const data: AuthResponse = await response.json()

    return data
}

let inflightRefreshPromise: Promise<AuthResponse> | null = null

export async function refreshAccessToken(): Promise<AuthResponse> {
    if (inflightRefreshPromise) {
        return inflightRefreshPromise
    }

    inflightRefreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })

            await handleApiError(response, 'Refresh failed')

            const data: AuthResponse = await response.json()

            return data
        } finally {
            inflightRefreshPromise = null
        }
    })()

    return inflightRefreshPromise
}

export async function logoutFromServer(token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}/api/Auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
    })

    await handleApiError(response, 'Failed to logout from server')
}

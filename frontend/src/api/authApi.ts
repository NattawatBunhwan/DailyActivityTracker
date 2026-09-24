type LoginRequest = {
    email: string
    password: string
}

type AuthResponse = {
    token: string
    expiresAt: string
    refreshToken: string
}

export async function login({ email, password }: LoginRequest): Promise<AuthResponse> {
    const response = await fetch('https://localhost:7127/api/Auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
        })
    })

    if (!response.ok) {
        throw new Error('Login failed')
    }

    const data: AuthResponse = await response.json()

    return data
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch('https://localhost:7127/api/Auth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken
        })
    })

    if (!response.ok) {
        throw new Error('Refresh failed')
    }

    const data: AuthResponse = await response.json()

    return data
}

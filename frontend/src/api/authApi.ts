type LoginRequest = {
    email: string
    password: string
}

type LoginResponse = {
    token: string
    expiresAt: string
    refreshToken: string
}

export async function login({ email, password }: LoginRequest): Promise<LoginResponse> {
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

    const data: LoginResponse = await response.json()

    return data
}

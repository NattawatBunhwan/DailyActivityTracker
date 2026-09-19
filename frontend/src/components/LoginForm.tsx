import { useState } from "react"

type LoginResponse = {
    token: string
    expiresAt: string
    refreshToken: string
}

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [token, setToken] = useState('')

    return (
        <div>
            <input 
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email" 
            />

            <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
            />

            <button onClick={handleLogin}>
                Login
            </button>

        </div>
    )
    async function handleLogin() {
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
            console.log('Login failed')
            return
        }

        const data: LoginResponse = await response.json()

        setToken(data.token)

        const activitiesResponse = await fetch('https://localhost:7127/api/Activities', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${data.token}`,
            },
        })

        const activitiesData = await activitiesResponse.json()

        console.log(activitiesData)
    }
}


export default LoginForm
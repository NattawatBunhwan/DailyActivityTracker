import { useState } from "react"
import type { Activity } from "../types/activity"
import ActivityList from "./ActivityList"

type LoginResponse = {
    token: string
    expiresAt: string
    refreshToken: string
}

type ActivitiesResponse = {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    items: Activity[]
}

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [token, setToken] = useState('')
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

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

            {isLoading ? (<p>Loading...</p>) : (<button onClick={handleLogin}>Login</button>)}
            {error && <p>{error}</p>}

            <ActivityList activities={activities} />
        </div>
    )
    
    async function handleLogin() {
        setError('')
        setIsLoading(true)
        
        try {
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
                setError('Login failed')
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

            if (!activitiesResponse.ok) {
                setError('Failed to load activities.')
                return
            }

            const activitiesData: ActivitiesResponse = await activitiesResponse.json()

            setActivities(activitiesData.items)
        } catch {
            setError('Unable to connect to the server')
        } finally {
            setIsLoading(false)
        }
    }
}


export default LoginForm
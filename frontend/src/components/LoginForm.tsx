import { useState } from "react"
import { login } from "../api/authApi"
import useAuth from "../hooks/useAuth"

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const auth = useAuth()

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
        </div>
    )
    
    async function handleLogin() {
        setError('')
        setIsLoading(true)
        
        try {  
            const loginData = await login({ email, password })
    
            auth.setIsAuthenticated(true)
            auth.setToken(loginData.token)
            auth.setExpiresAt(loginData.expiresAt)
            auth.setRefreshToken(loginData.refreshToken)
        } catch {
            setError('Unable to connect to the server')
        } finally {
            setIsLoading(false)
        }
    }
}

export default LoginForm
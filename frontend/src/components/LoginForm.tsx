import { useState, type SubmitEvent } from "react"
import { login } from "../api/authApi"
import useAuth from "../hooks/useAuth"
import './LoginForm.css'

function LoginForm({ onAuthenticated }: { onAuthenticated: () => void }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const auth = useAuth()

    return (
        <form className="login-form" onSubmit={handleLogin}>
            <h2>Login</h2>

            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
            >
                {isLoading ? 'Logging in...' : 'Login'}
            </button>
            
            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}
        </form>
    )
    
    async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        
        setError('')
        setIsLoading(true)
        
        try {  
            const loginData = await login({ email, password })
    
            auth.setIsAuthenticated(true)
            auth.setToken(loginData.token)
            auth.setExpiresAt(loginData.expiresAt)
            auth.setRefreshToken(loginData.refreshToken)
            onAuthenticated()
        } catch (error) {
            setError(
                error instanceof Error ? error.message : 'Unable to connect to the server'
            )
        } finally {
            setIsLoading(false)
        }
    }
}

export default LoginForm

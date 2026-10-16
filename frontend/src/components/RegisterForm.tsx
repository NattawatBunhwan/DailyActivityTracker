import { useState, type SubmitEvent } from "react";
import { login, register } from "../api/authApi";
import  useAuth  from "../hooks/useAuth"
import './RegisterForm.css'

function RegisterForm() {
    const auth = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [age, setAge] = useState('')
    const [occupation, setOccupation] = useState('')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleRegister(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isLoading) {
            return
        }

        setError('')
        setIsLoading(true)

        let registrationCompleted = false

        try {
            await register({
                email,
                password,
                firstName,
                lastName,
                age: Number(age),
                occupation,
            })

            registrationCompleted = true

            const loginData = await login({ email, password})

            auth.setIsAuthenticated(true)
            auth.setToken(loginData.token)
            auth.setExpiresAt(loginData.expiresAt)
            auth.setRefreshToken(loginData.refreshToken)
        } catch (error) {
            if (registrationCompleted) {
                setError('Account created successfully, but login failed. Please login with your new account.')
            } else {
                setError(
                    error instanceof Error ? error.message : 'Unable to create account'
                )
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleRegister}>
            <h2>Creat Account</h2>

            <div>
                <label htmlFor="register-email">Email</label>
                <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="register-password">Password</label>
                <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="register-first-name">First Name</label>
                <input
                    id="register-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="register-last-name">Last Name</label>
                <input
                    id="register-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                />
            </div>

            <div>
                <label htmlFor="register-age">Age</label>
                <input
                    id="register-age"
                    type="number"
                    min="1"
                    max="150"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    list="age-suggestions"
                    required
                />
    
                <datalist id="age-suggestions">
                    <option value="15" />
                    <option value="18" />
                    <option value="20" />
                    <option value="25" />
                    <option value="30" />
                    <option value="35" />
                    <option value="40" />
                    <option value="50" />
                    <option value="60" />
                </datalist>
            </div>

            <div>
                <label htmlFor="register-occupation">Occupation</label>
                <input
                    id="register-occupation"
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value)}
                    required
                />
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                >
                    {isLoading ? 'Creating...' : 'Register'}
                </button>
            </div>

            {error && <p className="error-message" role="alert">{error}</p>}
        </form>
    )
}

export default RegisterForm
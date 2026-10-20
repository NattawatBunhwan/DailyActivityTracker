import { useState, type SubmitEvent } from "react";
import { login, register } from "../api/authApi";
import  useAuth  from "../hooks/useAuth"
import { Label, NumberField } from '@heroui/react';
import './RegisterForm.css'

function RegisterForm({ onAuthenticated }: { onAuthenticated: () => void }) {
    const auth = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [age, setAge] = useState('1')
    const [occupation, setOccupation] = useState('')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleRegister(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isLoading) {
            return
        }

        setError('')

        const parsedAge = Number(age);
        
        if (
            age.trim() === '' ||
            !Number.isInteger(parsedAge) ||
            parsedAge < 1 ||
            parsedAge > 150
        ) {
            setError('Please enter a valid age between 1 and 150.');
            return;
        }
        
        setIsLoading(true)
        
        let registrationCompleted = false
        
        try {
            await register({
                email,
                password,
                firstName,
                lastName,
                age: parsedAge,
                occupation,
            })

            registrationCompleted = true

            const loginData = await login({ email, password})

            auth.setIsAuthenticated(true)
            auth.setToken(loginData.token)
            auth.setExpiresAt(loginData.expiresAt)
            auth.setRefreshToken(loginData.refreshToken)
            onAuthenticated()
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
        <form className="register-form" onSubmit={handleRegister}>
            <h2>Create Account</h2>

            <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                    id="register-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="register-first-name">First Name</label>
                <input
                    id="register-first-name"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="register-last-name">Last Name</label>
                <input
                    id="register-last-name"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                />
            </div>
            
            <div className="form-group age-field">
                <NumberField
                    className="age-number-field"
                    name="age"
                    minValue={1}
                    maxValue={150}
                    step={1}
                    value={age === '' ? NaN : Number(age)}
                    onChange={(value) => {setAge(Number.isNaN(value) ? '' : String(value))}}
                    
                >
                    <Label>Age</Label>
                    <NumberField.Group className="age-number-group">
                    <NumberField.DecrementButton />
                    <NumberField.Input className="age-number-input" />
                    <NumberField.IncrementButton />
                    </NumberField.Group>
                </NumberField>
            </div>

            <div className="form-group">
                <label htmlFor="register-occupation">Occupation</label>
                <input
                    id="register-occupation"
                    name="occupation"
                    placeholder="e.g. Teacher"
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                >
                    {isLoading ? 'Creating...' : 'Register'}
                </button>
            </div>

            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}
        </form>
    )
}

export default RegisterForm

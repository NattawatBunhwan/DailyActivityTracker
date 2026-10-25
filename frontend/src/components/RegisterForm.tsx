import { useState, type SubmitEvent } from "react";
import { login, register } from "../api/authApi";
import  useAuth  from "../hooks/useAuth"
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
    const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', firstName: '', lastName: '', age: '', occupation: '' })

    function updateField<K extends keyof typeof fieldErrors>(field: K, value: string, setter: (value: string) => void) {
        setter(value)
        if (value.trim()) setFieldErrors(current => ({ ...current, [field]: '' }))
    }

    async function handleRegister(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isLoading) {
            return
        }

        setError('')

        const parsedAge = Number(age);
        const nextFieldErrors = {
            email: email.trim() ? '' : 'Email is required.',
            password: password ? '' : 'Password is required.',
            firstName: firstName.trim() ? '' : 'First name is required.',
            lastName: lastName.trim() ? '' : 'Last name is required.',
            age: age.trim() !== '' && Number.isInteger(parsedAge) && parsedAge >= 1 && parsedAge <= 150 ? '' : 'Please enter a valid age between 1 and 150.',
            occupation: occupation.trim() ? '' : 'Occupation is required.',
        }
        setFieldErrors(nextFieldErrors)
        if (Object.values(nextFieldErrors).some(Boolean)) return
        
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
        <form className="register-form" onSubmit={handleRegister} noValidate>
            <h2>Create Account</h2>

            <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(event) => updateField('email', event.target.value, setEmail)}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                />
                {fieldErrors.email && <p className="field-error" id="register-email-error" role="alert">{fieldErrors.email}</p>}
            </div>

            <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                    id="register-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => updateField('password', event.target.value, setPassword)}
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                />
                {fieldErrors.password && <p className="field-error" id="register-password-error" role="alert">{fieldErrors.password}</p>}
            </div>

            <div className="form-group">
                <label htmlFor="register-first-name">First Name</label>
                <input
                    id="register-first-name"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(event) => updateField('firstName', event.target.value, setFirstName)}
                    required
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={fieldErrors.firstName ? "register-first-name-error" : undefined}
                />
                {fieldErrors.firstName && <p className="field-error" id="register-first-name-error" role="alert">{fieldErrors.firstName}</p>}
            </div>

            <div className="form-group">
                <label htmlFor="register-last-name">Last Name</label>
                <input
                    id="register-last-name"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(event) => updateField('lastName', event.target.value, setLastName)}
                    required
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={fieldErrors.lastName ? "register-last-name-error" : undefined}
                />
                {fieldErrors.lastName && <p className="field-error" id="register-last-name-error" role="alert">{fieldErrors.lastName}</p>}
            </div>
            
            <div className="form-group age-field">
                <label htmlFor="register-age">Age</label>
                <div className="age-number-group">
                    <button
                        type="button"
                        className="age-number-step-button"
                        aria-label="Decrease age"
                        onClick={() => setAge(String(Math.max(1, (Number(age) || 1) - 1)))}
                        disabled={age !== '' && Number(age) <= 1}
                    >
                        <span aria-hidden="true">−</span>
                    </button>
                    <input
                        id="register-age"
                        className="age-number-input"
                        name="age"
                        type="number"
                        min={1}
                        max={150}
                        step={1}
                        value={age}
                        onChange={(event) => updateField('age', event.target.value, setAge)}
                        aria-invalid={Boolean(fieldErrors.age)}
                        aria-describedby={fieldErrors.age ? "register-age-error" : undefined}
                    />
                    <button
                        type="button"
                        className="age-number-step-button"
                        aria-label="Increase age"
                        onClick={() => setAge(String(Math.min(150, (Number(age) || 0) + 1)))}
                        disabled={age !== '' && Number(age) >= 150}
                    >
                        <span aria-hidden="true">+</span>
                    </button>
                </div>
                {fieldErrors.age && <p className="field-error" id="register-age-error" role="alert">{fieldErrors.age}</p>}
            </div>

            <div className="form-group">
                <label htmlFor="register-occupation">Occupation</label>
                <input
                    id="register-occupation"
                    name="occupation"
                    placeholder="e.g. Teacher"
                    value={occupation}
                    onChange={(event) => updateField('occupation', event.target.value, setOccupation)}
                    required
                    aria-invalid={Boolean(fieldErrors.occupation)}
                    aria-describedby={fieldErrors.occupation ? "register-occupation-error" : undefined}
                />
                {fieldErrors.occupation && <p className="field-error" id="register-occupation-error" role="alert">{fieldErrors.occupation}</p>}
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

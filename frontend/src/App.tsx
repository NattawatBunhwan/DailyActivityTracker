import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import RegisterForm from './components/RegisterForm'
import { useState } from 'react'
import { CalendarCheck, LogOut, UserRound, UserRoundPlus } from "lucide-react"

function App() {
  const auth = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  
  
  return (
    <main>
      <header className="app-header">
        <div className="app-header-brand">
          <CalendarCheck
            size={24}
            aria-hidden="true"
          />

          <div className="app-header-text">
            <Header
              title="Daily Activity Tracker"
              description="Track your activities and stay organized."
            />
          </div>
        </div>

        {auth.isAuthenticated && (
          <div className="auth-section">
            <div className="auth-user-info">
              <UserRound
                size={20}
                aria-hidden="true"
              />
              <p>Logged in</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
            >
              <LogOut
                size={16}
                aria-hidden="true"
              />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {auth.isAuthenticated ? (
        <Activities />
        ) : (
          showRegister ? (
            <>
              <div className="auth-container">
                <div className="auth-intro">
                  <div className="auth-intro-icon" aria-hidden="true">
                    <UserRoundPlus size={28} />
                  </div>

                  <h2>Create your account</h2>

                  <p>
                    Start organizing your day with Daily Activity Tracker.
                  </p>
                </div>

                <RegisterForm />

                <div className="auth-footer">
                  <p>Already have an account?</p>

                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-container">
              <div className="auth-intro">
                <div className="auth-intro-icon" aria-hidden="true">
                    <CalendarCheck size={28} />
                </div>

                <h2>Welcome back</h2>

                <p>Log in to manage your daily activities.</p>
              </div>

              <LoginForm />

              <div className="auth-footer">
                <p>Don't have an account?</p>

                <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                >
                    Create Account
                </button>
              </div>
            </div>
          )
        )}
    </main>
  )


  function handleLogout() {
    if (window.confirm("Are you sure you want to logout")) {
      auth.logout()
      setShowRegister(false)
    }
  }
}

export default App
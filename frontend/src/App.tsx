import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import RegisterForm from './components/RegisterForm'
import { useEffect, useState } from 'react'
import { CalendarCheck, LogOut, UserRound, UserRoundPlus } from "lucide-react"
import ActivityDetails from './components/ActivityDetails'

function App() {
  const auth = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const listScrollY = useState(() => ({ current: 0 }))[0]

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      setCurrentPath(path)
      if (path === "/activities" || path === "/") {
        requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [listScrollY])

  function navigate(path: string, replace = false) {
    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }
    setCurrentPath(path)
  }
  
  
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
        <>
          <div hidden={/^\/activities\/[^/]+\/?$/.test(currentPath)}>
            <Activities onViewDetails={(id) => {
              listScrollY.current = window.scrollY
              navigate(`/activities/${encodeURIComponent(id)}`)
            }} />
          </div>
          {/^\/activities\/[^/]+\/?$/.test(currentPath) ? (
            <ActivityDetails
            activityId={decodeURIComponent(currentPath.split('/')[2])}
            onBack={() => navigate('/activities')}
            onDeleted={() => navigate('/activities')}
            />
          ) : currentPath === '/activities' || currentPath === '/' ? null : (
            <section className="activities"><h1>Page not found</h1><button type="button" onClick={() => navigate('/activities')}>Back to Activities</button></section>
          )}
        </>
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

                <RegisterForm onAuthenticated={() => navigate('/activities', true)} />

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

              <LoginForm onAuthenticated={() => navigate('/activities', true)} />

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
      navigate('/activities', true)
      void auth.logout()
      setShowRegister(false)
    }
  }
}

export default App

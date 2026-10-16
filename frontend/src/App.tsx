import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import RegisterForm from './components/RegisterForm'
import { useState } from 'react'

function App() {
  const auth = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  
  return (
    <main>
      <Header 
        title="Daily Activity Tracker"
        description="Track your activities and stay organized." 
      />

      {auth.isAuthenticated ? (
        <>
          <div className='auth-section'>
            <p>Logged in</p>

            <button onClick={handleLogout}>
              Logout
            </button> 
          </div>
          
          <div>
            <Activities/>
          </div>   
        </>
        
      ) : (
        <>
          {showRegister ? (
            <>
              <RegisterForm />

              <p>Already have an account?</p>
              <button onClick={() => setShowRegister(false)}>
                Back to Login
              </button>
            </>
          ) : (
            <>
              <p>Not logged in</p>

              <LoginForm/>

              <p>Don't have an account?</p>
              <button onClick={() => setShowRegister(true)}>
                Create Account
              </button>
            </>
          )}
        </>
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
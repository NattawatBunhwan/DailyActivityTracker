import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import CreateActivityForm from './components/CreateActivityForm'
import { useState } from 'react'

function App() {
  const auth = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  return (
    <main>
      <Header 
        title="Daily Activity Tracker"
        description="Track your activities and stay organized." 
      />

      <p>
        {auth.isAuthenticated ? "Logged in" : "Not logged in"}
      </p>

      {auth.isAuthenticated && (
        <>
          <CreateActivityForm
            onActivityCreated={() => setRefreshTrigger(prev => prev + 1)}
          />
          <Activities refreshTrigger={refreshTrigger}/>
        </>
      )}

      {!auth.isAuthenticated && <LoginForm/>}

      {auth.isAuthenticated && (
        <button onClick={handleLogout}>
          Logout
        </button>
      )}
    </main>
  )

  function handleLogout() {
    if (window.confirm("Are you sure you want to logout")) {
      auth.logout()
    }
  }
}

export default App
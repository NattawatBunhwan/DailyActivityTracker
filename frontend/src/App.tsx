import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'

function App() {
  const auth = useAuth()
  
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
          <p>Not logged in</p>
        
          <LoginForm/>
        </>
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
import { useEffect, useState } from 'react'
import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  useEffect(() => {
    document.title = name || 'Daily Activity Tracker'
  }, [name])
  const auth = useAuth()
  
  return (
    <main>
      <Header 
        title="Daily Activity Tracker"
        description="Track your activities and stay organized." 
      />

      <p>Count: {count}</p>

      <button onClick={() => setCount(count + 1 )}>
        Add
      </button>

      <input 
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder='Enter your name' 
      />

      <p>Hello, {name}</p>

      <p>
        {auth.isAuthenticated ? "Logged in" : "Not logged in"}
      </p>

      {auth.isAuthenticated ? <Activities/> : <LoginForm/>}

    </main>
  )
}

export default App
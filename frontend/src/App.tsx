import { useState } from 'react'
import Header from './components/Header'
import ActivityCard from './components/ActivityCard'
import type { Activity } from './types/activity'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  const activities: Activity[] = [
    {
      id: 1,
      title: "อ่านหนังสือ",
      priority: "High",
      status: "In Progress",
    },
    {
      id: 2,
      title: "วิ่งออกกำลังกาย",
      priority: "Medium",
      status: "Pending",
    }
  ] 
  
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

      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
        />
      ))}
    </main>
  )
}

export default App
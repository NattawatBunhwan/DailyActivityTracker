import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import ActivityList from "./ActivityList";
import { getActivities } from "../api/activityApi";
import useAuth from "../hooks/useAuth";

function Activities() {
    const auth = useAuth()
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function loadActivities(token: string) {
        setError(null)
        setIsLoading(true)

        try {
            if (token) {
                const data = await getActivities(token)
                setActivities(data.items)
            }
        } catch {
            setError("Failed to load activities.")
        } finally {
            setIsLoading(false)
        }        
    }

    useEffect(() => {
        loadActivities(auth.token)
    }, [auth.token])

    if (isLoading) {
        return <p>Loading activities...</p>
    }

    if (error) {
        return (
            <>
                <p>{error}</p>
                <button onClick={() => loadActivities(auth.token)}>
                    Retry
                </button>
            </>
        )
    }

    if (activities.length === 0) {
        return <p>No activities yet.</p>
    }
    
    return (
        <>
            <button onClick={() => loadActivities(auth.token)}>
                Refresh
            </button>

            <ActivityList activities={activities} />
        </>
    )
}

export default Activities

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
    const [page, setPage] = useState<number>(1)
    const [totalPages, setTotalPages] = useState<number>(0)

    async function loadActivities(token: string, page: number) {
        setError(null)
        setIsLoading(true)

        try {
            if (token) {
                const data = await getActivities(token, page)
                setActivities(data.items)
                setTotalPages(data.totalPages)
            }
        } catch {
            setError("Failed to load activities.")
        } finally {
            setIsLoading(false)
        }        
    }

    useEffect(() => {
        loadActivities(auth.token, page)
    }, [auth.token, page])

    if (isLoading) {
        return <p>Loading activities...</p>
    }

    if (error) {
        return (
            <>
                <p>{error}</p>
                <button onClick={() => loadActivities(auth.token, page)}>
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
            <button onClick={() => loadActivities(auth.token, page)}>
                Refresh
            </button>

            <ActivityList activities={activities} />

            <button onClick={() => setPage(prevPage => prevPage - 1)} disabled={page <= 1 || isLoading}>
                Previous
            </button>

            <button onClick={() => setPage(prevPage => prevPage + 1)} disabled={page >= totalPages || isLoading}>
                Next
            </button>
        </>
    )
}

export default Activities

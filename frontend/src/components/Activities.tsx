import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import ActivityList from "./ActivityList";
import { deleteActivity, getActivities, getActivityById } from "../api/activityApi";
import useAuth from "../hooks/useAuth";
import EditActivityForm from "./EditActivityForm";

type ActivitiesProps = {
    refreshTrigger: number
}

function Activities({ refreshTrigger }: ActivitiesProps) {
    const auth = useAuth()
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState<number>(1)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
    const [refreshUpdateTrigger, setRefreshUpdateTrigger] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const [refreshDeleteTrigger, setRefreshDeleteTrigger] = useState(0)

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

    async function loadSelectedActivity(token: string, activityId: string) {
        setError(null)
        setIsLoading(true)

        try {
            const data = await getActivityById(token, activityId)
            setSelectedActivity(data)
        } catch {
            setError("Failed to load selected activity.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadActivities(auth.token, page)
    }, [auth.token, page, refreshTrigger, refreshUpdateTrigger, refreshDeleteTrigger])

    useEffect(() => {
        if (!selectedActivityId) return
        
        loadSelectedActivity(auth.token, selectedActivityId)
    }, [auth.token, selectedActivityId])

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

    function handleEditActivity(activityId: string) {
        setSelectedActivityId(activityId)
    }

    function handleActivityUpdated() {
        setRefreshUpdateTrigger(prev => prev + 1)
        setSelectedActivityId(null)
        setSelectedActivity(null)
    }

    async function handleDeleteActivity(activityId: string) {
        const confirmed = window.confirm("Are you sure you want to delete this activity?")

        if (!confirmed) {
            return
        }

        setIsDeleting(true)

        try {
            await deleteActivity(auth.token, activityId)

            setRefreshDeleteTrigger(prev => prev + 1)

            window.alert("Activity deleted successfully.")
        } catch {
            window.alert("Failed to delete activity.")
        } finally {
            setIsDeleting(false)
        }
    }
    
    return (
        <>
            <button onClick={() => loadActivities(auth.token, page)}>
                Refresh
            </button>

            {activities.length === 0 ? (
                <p>No activities yet.</p>
            ) : (
                <ActivityList 
                    activities={activities}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    isDeleting={isDeleting}
                />
            )}

            {selectedActivity !== null && (
                <EditActivityForm
                    key={selectedActivity.id}
                    activity={selectedActivity}
                    onActivityUpdated={handleActivityUpdated}
                />
            )}

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

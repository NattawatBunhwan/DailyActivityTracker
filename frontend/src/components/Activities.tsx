import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import ActivityList from "./ActivityList";
import { deleteActivity, getActivities, getActivityById } from "../api/activityApi";
import useAuth from "../hooks/useAuth";
import EditActivityForm from "./EditActivityForm";
import EditModal from "./EditModal";
import DeleteModal from "./DeleteModal";

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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
    const activityToDelete = activities.find(activity => activity.id === deleteActivityId)

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

    function handleDeleteActivity(activityId: string) {
        setDeleteActivityId(activityId)
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

            <EditModal
                isOpen={selectedActivity !== null}
                onClose={handleCloseEditModal}
            >
                {selectedActivity && (
                    <EditActivityForm
                        key={selectedActivity.id}
                        activity={selectedActivity}
                        onActivityUpdated={handleActivityUpdated}
                        onUnsavedChangesChange={handleUnsavedChangesChange}
                    />
                )}
            </EditModal>

            <DeleteModal
                isOpen={deleteActivityId !== null}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
            >
                <h2>Delete Activity</h2>
                <p className="delete-warning">
                    Are you sure you want to delete <strong>"{activityToDelete?.title}"</strong>?
                </p>
            </DeleteModal>
            
            <button onClick={() => setPage(prevPage => prevPage - 1)} disabled={page <= 1 || isLoading}>
                Previous
            </button>

            <button onClick={() => setPage(prevPage => prevPage + 1)} disabled={page >= totalPages || isLoading}>
                Next
            </button>
        </>
    )

    function handleCloseEditModal() {
        if (hasUnsavedChanges) {
            const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?")
            
            if (!confirmed) {
                return
            }
        }

        setHasUnsavedChanges(false)
        setSelectedActivity(null)
        setSelectedActivityId(null)
    }

    async function handleConfirmDelete() {
        if (!deleteActivityId) {
            return
        }

        setIsDeleting(true)

        try {
            await deleteActivity(auth.token, deleteActivityId)

            setRefreshDeleteTrigger(prev => prev + 1)

            setDeleteActivityId(null)

            window.alert("Activity deleted successfully.")
        } catch {
            window.alert("Failed to delete activity.")
        } finally {
            setIsDeleting(false)
        }
    }

    function handleCloseDeleteModal() {
        if (isDeleting) {
            return
        }

        setDeleteActivityId(null)
    }

    function handleUnsavedChangesChange(hasChanges: boolean) {
        setHasUnsavedChanges(hasChanges)
    }
}

export default Activities

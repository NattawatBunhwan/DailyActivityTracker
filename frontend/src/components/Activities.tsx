import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import ActivityList from "./ActivityList";
import { deleteActivity, getActivities, getActivityById } from "../api/activityApi";
import useAuth from "../hooks/useAuth";
import EditActivityForm from "./EditActivityForm";
import EditModal from "./EditModal";
import DeleteModal from "./DeleteModal";
import EmptyState from "./EmptyState";
import CreateModal from "./CreateModal";
import CreateActivityForm from "./CreateActivityForm";
import "./Activities.css"
import CreatedActivityForm from "./CreatedActivityForm";

function Activities() {
    const auth = useAuth()
    const [activities, setActivities] = useState<Activity[]>([])
    const [activitiesError, setActivitiesError] = useState<string | null>(null)
    const [selectedActivityError, setSelectedActivityError] = useState<string | null>(null)
    const [page, setPage] = useState<number>(1)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
    const [refreshUpdateTrigger, setRefreshUpdateTrigger] = useState(0)
    const [isLoadingActivities, setIsLoadingActivities] = useState(false)
    const [isLoadingSelectedActivity, setIsLoadingSelectedActivity] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [refreshDeleteTrigger, setRefreshDeleteTrigger] = useState(0)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
    const activityToDelete = activities.find(activity => activity.id === deleteActivityId)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [createdActivity, setCreatedActivity] = useState<Activity | null>(null)

    async function loadActivities(token: string, page: number) {
        setActivitiesError(null)
        setIsLoadingActivities(true)

        try {
            if (token) {
                const data = await getActivities(token, page)
                setActivities(data.items)
                setTotalPages(data.totalPages)
            }
        } catch {
            setActivitiesError("Failed to load activities.")
        } finally {
            setIsLoadingActivities(false)
        }        
    }

    async function loadSelectedActivity(token: string, activityId: string) {
        setSelectedActivityError(null)
        setIsLoadingSelectedActivity(true)

        try {
            const data = await getActivityById(token, activityId)
            setSelectedActivity(data)
        } catch {
            setSelectedActivityError("Failed to load selected activity.")
        } finally {
            setIsLoadingSelectedActivity(false)
        }
    }

    useEffect(() => {
        loadActivities(auth.token, page)
    }, [auth.token, page, refreshTrigger, refreshUpdateTrigger, refreshDeleteTrigger])

    useEffect(() => {
        if (!selectedActivityId) return
        
        loadSelectedActivity(auth.token, selectedActivityId)
    }, [auth.token, selectedActivityId])

    if (isLoadingActivities) {
        return <p>Loading activities...</p>
    }

    if (activitiesError) {
        return (
            <>
                <p>{activitiesError}</p>
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
        setDeleteError(null)
        setDeleteActivityId(activityId)
    }

    function handleRetrySelectedActivity() {
        if (!selectedActivityId) {
            return
        }

        loadSelectedActivity(auth.token, selectedActivityId)
    }
    
    return (
        <section className="activities">
            <header className="activities-header">
                <h2>Activities</h2>
                <button className="create-activity-button" onClick={() => {
                    setCreatedActivity(null)
                    setIsCreateModalOpen(true)
                }}
                >
                    CreateActivity
                </button>
            </header>
            
            <button onClick={() => loadActivities(auth.token, page)}>
                Refresh
            </button>

            {activities.length === 0 ? (
                <EmptyState/>
            ) : (
                <ActivityList 
                    activities={activities}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    isDeleting={isDeleting}
                />
            )}

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            > 
                {createdActivity === null ? (
                    <CreateActivityForm
                        onActivityCreated={(createData) => {
                            setRefreshTrigger(prev => prev + 1)
                            setCreatedActivity(createData)
                        }   }
                    />
                ) : (
                    <CreatedActivityForm
                        activityCreated={createdActivity}
                    />
                )}
            </CreateModal> 

            <EditModal
                isOpen={
                    selectedActivityId !== null ||
                    selectedActivity !== null
                }
                onClose={handleCloseEditModal}
            >
                {isLoadingSelectedActivity ? (
                    <p>Loading activity...</p>
                ) : selectedActivityError ? (
                    <>
                        <p>{selectedActivityError}</p>
                        <div className="modal-actions">
                            <button onClick={handleRetrySelectedActivity}>
                                Retry
                            </button>
                        </div>
                    </>
                ) : (
                    selectedActivity && (
                        <EditActivityForm
                            key={selectedActivity.id}
                            activity={selectedActivity}
                            onActivityUpdated={handleActivityUpdated}
                            onUnsavedChangesChange={handleUnsavedChangesChange}
                        />
                    )
                )}
            </EditModal>

            <DeleteModal
                isOpen={deleteActivityId !== null}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
                deleteError={deleteError}
            >
                <h2>Delete Activity</h2>
                <p className="delete-warning">
                    Are you sure you want to delete <strong>"{activityToDelete?.title}"</strong>?
                </p>
            </DeleteModal>
            
            <div className="pagination">
                <button onClick={() => setPage(prevPage => prevPage - 1)} disabled={page <= 1 || isLoadingActivities}>
                    Previous
                </button>

                <button onClick={() => setPage(prevPage => prevPage + 1)} disabled={page >= totalPages || isLoadingActivities}>
                    Next
                </button>
            </div>   
        </section>
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

        setDeleteError(null)
        setIsDeleting(true)

        try {
            await deleteActivity(auth.token, deleteActivityId)

            setRefreshDeleteTrigger(prev => prev + 1)

            setDeleteActivityId(null)

            window.alert("Activity deleted successfully.")
        } catch {
            setDeleteError("Failed to delete activity.")
        } finally {
            setIsDeleting(false)
        }
    }

    function handleCloseDeleteModal() {
        if (isDeleting) {
            return
        }

        setDeleteError(null)
        setDeleteActivityId(null)
    }

    function handleUnsavedChangesChange(hasChanges: boolean) {
        setHasUnsavedChanges(hasChanges)
    }
}

export default Activities

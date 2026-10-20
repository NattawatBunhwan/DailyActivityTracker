import { useState, useEffect, useRef } from "react";
import type { Activity, ActivityStatus, ActivityPriority, ActivitySummary } from "../types/activity";
import ActivityList from "./ActivityList";
import { deleteActivity, getActivities, getActivityById, getActivitySummary } from "../api/activityApi";
import useAuth from "../hooks/useAuth";
import EditActivityForm from "./EditActivityForm";
import EditModal from "./EditModal";
import DeleteModal from "./DeleteModal";
import EmptyState from "./EmptyState";
import CreateModal from "./CreateModal";
import CreateActivityForm from "./CreateActivityForm";
import "./Activities.css"
import CreatedActivityForm from "./CreatedActivityForm";
import { Layers, Clock3, RefreshCw, CircleCheck } from "lucide-react"
import { SearchField, Pagination } from "@heroui/react";
import { getPriorityLabel, getStatusLabel } from "../utils/activity";

function Activities() {
    const auth = useAuth()
    const [activities, setActivities] = useState<Activity[]>([])
    const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const [isLoadingSummary, setIsLoadingSummary] = useState(false)
    const [activitiesError, setActivitiesError] = useState<string | null>(null)
    const [hasLoadedActivities, setHasLoadedActivities] = useState(false)
    const [selectedActivityError, setSelectedActivityError] = useState<string | null>(null)
    const [page, setPage] = useState<number>(1)
    const [statusFilter, setStatusFilter] = useState<ActivityStatus | "">("")
    const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | "">("")
    const [availableStatuses, setAvailableStatuses] = useState<ActivityStatus[]>([])
    const [availablePriorities, setAvailablePriorities] = useState<ActivityPriority[]>([])
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [sortBy, setSortBy] = useState("createdat")
    const [descending, setDescending] = useState(true)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
    const [refreshUpdateTrigger, setRefreshUpdateTrigger] = useState(0)
    const [isLoadingActivities, setIsLoadingActivities] = useState(false)
    const [isLoadingSelectedActivity, setIsLoadingSelectedActivity] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [refreshDeleteTrigger, setRefreshDeleteTrigger] = useState(0)
    const deleteButtonRef = useRef<HTMLButtonElement | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
    const activityToDelete = activities.find(activity => activity.id === deleteActivityId)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [createdActivity, setCreatedActivity] = useState<Activity | null>(null)
    const [isUpdatingActivity, setIsUpdatingActivity] = useState(false)
    const [isCreatingActivity, setIsCreatingActivity] = useState(false)
    const editButtonRef = useRef<HTMLButtonElement | null>(null)
    const editActivityIdRef = useRef<string | null>(null)
    const isEditModalOpen = selectedActivityId !== null || selectedActivity !== null
    const wasEditModalOpenRef = useRef(false)
    const pendingEditFocusRef = useRef(false)
    const createTriggerRef = useRef<HTMLButtonElement | null>(null)
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    
    useEffect(() => {
        setPage(1)
    }, [statusFilter, priorityFilter, search, sortBy, descending])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search.trim())
        }, 400)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [search])

    useEffect(() => {
        loadActivities(auth.token, page)
    }, [auth.token, page, refreshTrigger, refreshUpdateTrigger, refreshDeleteTrigger, statusFilter, priorityFilter, debouncedSearch, sortBy, descending])

    useEffect(() => {
        loadActivitySummary(auth.token)
    }, [auth.token, refreshTrigger, refreshUpdateTrigger, refreshDeleteTrigger])

    useEffect(() => {
        if (!selectedActivityId) return
        
        loadSelectedActivity(auth.token, selectedActivityId)
    }, [auth.token, selectedActivityId])

    useEffect(() => {
        if (wasEditModalOpenRef.current && !isEditModalOpen) {
            const button = editButtonRef.current

            requestAnimationFrame(() => {
                if (button?.isConnected) {
                    button.focus()
                }
            })
        }

        wasEditModalOpenRef.current = isEditModalOpen
    }, [isEditModalOpen])

    useEffect(() => {
        if (isLoadingActivities) return
        if (!pendingEditFocusRef.current) return

        const activityId = editActivityIdRef.current
        if (!activityId) return

        const selector =
            `button[data-action="edit"][data-activity-id="${activityId}"]`

        const button = document.querySelector<HTMLButtonElement>(selector)

        if (button?.isConnected) {
            button.focus()
            pendingEditFocusRef.current = false
        }
    }, [isLoadingActivities, activities])

    useEffect(() => {
        if (isCreateModalOpen) {
            return
        }

        createTriggerRef.current?.focus()
    }, [isCreateModalOpen])

    async function loadActivities(token: string, page: number) {
        if (!token) {
            setActivitiesError("Authentication required.")
            setActivities([])
            setAvailableStatuses([])
            setAvailablePriorities([])
            setTotalPages(0)
            setHasLoadedActivities(true)
            setIsLoadingActivities(false)
            return
        }

        setActivitiesError(null)
        setIsLoadingActivities(true)

        try {
            const data = await getActivities(token, {
                page,
                pageSize: 10,
                ...(statusFilter !== "" && { status: statusFilter }),
                ...(priorityFilter !== "" && { priority: priorityFilter }),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(sortBy && { sortBy, descending}),
            })

            setActivities(data.activities.items)
            setTotalPages(data.activities.totalPages)
            setAvailableStatuses(data.availableStatuses)
            setAvailablePriorities(data.availablePriorities)
            setHasLoadedActivities(true)
            
        } catch {
            setActivitiesError("Failed to load activities.")
        } finally {
            setIsLoadingActivities(false)
        }        
    }

    async function loadActivitySummary(token: string) {
        if (!token) return

        setSummaryError(null)
        setIsLoadingSummary(true)

        try {
            const data = await getActivitySummary(token)

            setActivitySummary(data)
        } catch {
            setActivitiesError("Failed to load activity summary.")
        } finally {
            setIsLoadingSummary(false)
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

    function handleEditActivity(activityId: string) {
        setSelectedActivityId(activityId)
    }

    function handleActivityUpdated() {
        pendingEditFocusRef.current = true
        setRefreshUpdateTrigger(prev => prev + 1)
        setSelectedActivityId(null)
        setSelectedActivity(null)
    }

    function handleDeleteActivity(button: HTMLButtonElement, activityId: string) {
        setDeleteError(null)
        deleteButtonRef.current = button
        setDeleteActivityId(activityId)
    }

    function handleRetrySelectedActivity() {
        if (!selectedActivityId) {
            return
        }

        loadSelectedActivity(auth.token, selectedActivityId)
    }

    function handleCloseEditModal() {
        if (isUpdatingActivity) {
            return
        }

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

    function handleOpenCreateModal(trigger: HTMLButtonElement) {
        createTriggerRef.current = trigger
        setCreatedActivity(null)
        setIsCreateModalOpen(true)
    }

    function handleCloseCreateModal() {
        setIsCreateModalOpen(false)
    }

    function handleEditButtonClick(button: HTMLButtonElement, activityId: string) {
        editButtonRef.current = button
        editActivityIdRef.current = activityId
    }

    const paginationItems: (
        | number
        | "start-ellipsis"
        | "end-ellipsis"
    )[] = [];

    if (totalPages <= 7) {
        for (let p = 1; p <= totalPages; p++) {
            paginationItems.push(p);
        }
    } else {
        const start = Math.max(2, Math.min(page - 2, totalPages - 3));
        const end = Math.min(totalPages - 1, start + 4);

        paginationItems.push(1);

        if (start > 2) {
            paginationItems.push("start-ellipsis");
        }

        for (let p = start; p <= end; p++) {
            paginationItems.push(p);
        }

        if (end < totalPages - 1) {
            paginationItems.push("end-ellipsis");
        }

        paginationItems.push(totalPages);
    }

    return (
        <section className="activities">
            <header className="activities-page-header">
                <h1>Daily Activities</h1>

                <div className="activities-page-actions">
                    {hasLoadedActivities &&
                        !isLoadingActivities &&
                        !activitiesError &&
                        activities.length > 0 && (
                        <>
                            <button
                                type="button"
                                className="refresh-activities-button"
                                onClick={() => loadActivities(auth.token, page)}
                                disabled={isLoadingActivities}
                            >
                                {isLoadingActivities ? "Refreshing..." : "Refresh"}
                            </button>

                            <button
                                type="button"
                                className="create-activity-button"
                                onClick={(event) =>
                                    handleOpenCreateModal(event.currentTarget)
                                }
                            >
                                + Create Activity
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="activity-summary">
                <div className="summary-card summary-total">
                    <div className="summary-card-heading">
                        <span className="summary-icon">
                            <Layers size={20} aria-hidden="true" />
                        </span>
                        <h3>Total Activities</h3>
                    </div>

                    {isLoadingSummary && activitySummary === null ? (
                        <p role="status">Loading...</p>
                    ) : summaryError ? (
                        <p role="alert">{summaryError}</p>
                    ) : (
                        <p className="summary-value">
                            {activitySummary?.totalActivities ?? 0}
                        </p>
                    )}
                </div>

                <div className="summary-card summary-pending">
                    <div className="summary-card-heading">
                        <span className="summary-icon">
                            <Clock3 size={20} aria-hidden="true" />
                        </span>
                        <h3>Pending</h3>
                    </div>

                    {isLoadingSummary && activitySummary === null ? (
                        <p role="status">Loading...</p>
                    ) : summaryError ? (
                        <p role="alert">{summaryError}</p>
                    ) : (
                        <p className="summary-value">
                            {activitySummary?.pendingCount ?? 0}
                        </p>
                    )}
                </div>

                <div className="summary-card summary-in-progress">
                    <div className="summary-card-heading">
                        <span className="summary-icon">
                            <RefreshCw size={20} aria-hidden="true"/>
                        </span>
                        <h3>In Progress</h3>
                    </div>

                    {isLoadingSummary && activitySummary === null ? (
                        <p role="status">Loading...</p>
                    ) : summaryError ? (
                        <p role="alert">{summaryError}</p>
                    ) : (
                        <p className="summary-value">
                            {activitySummary?.inProgressCount ?? 0}
                        </p>
                    )}
                </div>

                <div className="summary-card summary-completed">
                    <div className="summary-card-heading">
                        <span className="summary-icon">
                            <CircleCheck size={20} aria-hidden="true"/>
                        </span>
                        <h3>Completed</h3>
                    </div>

                    {isLoadingSummary && activitySummary === null ? (
                        <p role="status">Loading...</p>
                    ) : summaryError ? (
                        <p role="alert">{summaryError}</p>
                    ) : (
                        <p className="summary-value">
                            {activitySummary?.completedCount ?? 0}
                        </p>
                    )}
                </div>
            </div>

            {summaryError && (
                <p role="alert">{summaryError}</p>
            )}

            
            {isFiltersOpen && (
                <div className="activities-filters" id="activity-filters">
                    <div className="activity-filter-field">
                        <label htmlFor="activity-status-filter">Status</label>
                        <select
                            id="activity-status-filter"
                            value={statusFilter}
                            onChange={(event) => {
                                const value = event.target.value

                                setStatusFilter(
                                    value === "" ? "" : Number(value) as ActivityStatus
                                )
                                setPage(1)
                            }}
                        >
                            <option value="">All statuses</option>
                            {availableStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {getStatusLabel(status)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="activity-filter-field">
                        <label htmlFor="activity-priority-filter">Priority</label>
                        <select
                            id="activity-priority-filter"
                            value={priorityFilter}
                            onChange={(event) => {
                                const value = event.target.value

                                setPriorityFilter(
                                    value === "" ? "" : Number(value) as ActivityPriority
                                )
                                setPage(1)
                            }}
                        >
                            <option value="">All priorities</option>
                            {availablePriorities.map((priority) => (
                                <option key={priority} value={priority}>
                                    {getPriorityLabel(priority)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label>
                        Sort by
                        <select
                            value={sortBy}
                            onChange={(event) => {
                                setSortBy(event.target.value)
                                setPage(1)
                            }}
                        >
                            <option value="createdat">Date created</option>
                            <option value="activitydate">Activity date</option>
                            <option value="title">Title</option>
                            <option value="status">Status</option>
                            <option value="priority">Priority</option>
                        </select>
                    </label>

                    <label>
                        Sort order
                        <select
                            value={descending ? "desc" : "asc"}
                            onChange={(event) => {
                                setDescending(event.target.value === "desc")
                                setPage(1)
                            }}
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </label>

                    <div className="activity-filter-actions">
                        <button
                            type="button"
                            className="filter-clear-button"
                            onClick={() => {
                                setStatusFilter("")
                                setPriorityFilter("")
                                setPage(1)
                            }}
                            disabled={statusFilter === "" && priorityFilter === ""}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}


            {activitiesError && (
                <>
                    <p role="alert">{activitiesError}</p>
                    <button onClick={() => loadActivities(auth.token, page)}>
                        Retry
                    </button>
                </>
            )}
      
            <header className="activity-list-header">
                <h2>Activity List</h2>

                <SearchField
                    name="search"
                    value={search}
                    onChange={(value) => {
                        setSearch(value)
                        setPage(1)
                    }}
                >
                    <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="Search activities..." />
                        <SearchField.ClearButton />
                    </SearchField.Group>
                </SearchField>

                <button
                    type="button"
                    className="filter-toggle-button"
                    aria-label={isFiltersOpen ? "Hide filters" : "Show filters"}
                    aria-expanded={isFiltersOpen}
                    aria-controls="activity-filters"
                    onClick={() => setIsFiltersOpen((open) => !open)}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M4 7h16" />
                        <path d="M7 12h10" />
                        <path d="M10 17h4" />
                    </svg>
                </button>
            </header>

            {!hasLoadedActivities || isLoadingActivities ? (
                <p role="status">Loading activities...</p>
            ) : activitiesError ? (
                <div className="activities-error">
                    <p role="alert">{activitiesError}</p>
                    <button
                        type="button"
                        onClick={() => loadActivities(auth.token, page)}
                        disabled={isLoadingActivities}
                    >
                        Retry
                    </button>
                </div>
            ) : activities.length === 0 ? (
                <EmptyState
                    onOpenCreateModal={handleOpenCreateModal}
                />
            ) : (
                <ActivityList
                    activities={activities}
                    onEdit={handleEditActivity}
                    onEditButtonClick={handleEditButtonClick}
                    onDelete={handleDeleteActivity}
                    isDeleting={isDeleting}
                />
            )}

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateModal}
                isCreating={isCreatingActivity}
            > 
                {createdActivity === null ? (
                    <CreateActivityForm
                        onActivityCreated={(createData) => {
                            setRefreshTrigger(prev => prev + 1)
                            setCreatedActivity(createData)
                        }}
                        onCreatingChange={setIsCreatingActivity}
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
                isUpdating={isUpdatingActivity}
            >
                {isLoadingSelectedActivity ? (
                    <p role="status">Loading activity...</p>
                ) : selectedActivityError ? (
                    <>
                        <p role="alert">{selectedActivityError}</p>
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
                            onUpdatingChange={setIsUpdatingActivity}
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
                triggerButton={deleteButtonRef.current}
            >
                <h2 id="delete-modal-title">Delete Activity</h2>
                <p className="delete-warning">
                    Are you sure you want to delete <strong>"{activityToDelete?.title}"</strong>?
                </p>
            </DeleteModal>
            
            <Pagination className="activity-pagination">
                <Pagination.Content>
                    <Pagination.Item>
                        <Pagination.Previous
                            isDisabled={page === 1 || isLoadingActivities}
                            onPress={() => setPage((p) => p - 1)}
                        >
                            <Pagination.PreviousIcon />
                            <span>Previous</span>
                        </Pagination.Previous>
                    </Pagination.Item>

                    {paginationItems.map((item) =>
                        typeof item === "number" ? (
                            <Pagination.Item key={item}>
                                <Pagination.Link
                                    isActive={item === page}
                                    isDisabled={isLoadingActivities}
                                    onPress={() => setPage(item)}
                                >
                                    {item}
                                </Pagination.Link>
                            </Pagination.Item>
                        ) : (
                            <Pagination.Item key={item}>
                                <span className="pagination-ellipsis" aria-hidden="true">
                                    …
                                </span>
                            </Pagination.Item>
                        )
                    )}

                    <Pagination.Item>
                        <Pagination.Next
                            isDisabled={
                                page === totalPages || isLoadingActivities
                            }
                            onPress={() => setPage((p) => p + 1)}
                        >
                            <span>Next</span>
                            <Pagination.NextIcon />
                        </Pagination.Next>
                    </Pagination.Item>
                </Pagination.Content>
            </Pagination>
        </section>
    )
}

export default Activities

import { useState, useEffect, useRef, useCallback } from "react";
import type { Activity, ActivityStatus, ActivityPriority, ActivitySummary } from "../types/activity";
import ActivityList from "./ActivityList";
import { deleteActivity, getActivities, getActivityById, getActivitySummary } from "../api/activityApi";
import useAuth from "../hooks/useAuth";
import EditActivityForm from "./EditActivityForm";
import EditModal from "./EditModal";
import DeleteModal from "./DeleteModal";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import CreateModal from "./CreateModal";
import CreateActivityForm from "./CreateActivityForm";
import "./Activities.css"
import CreatedActivityForm from "./CreatedActivityForm";
import { Layers, Clock3, RefreshCw, CircleCheck, CircleX, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, X, Filter, SlidersHorizontal } from "lucide-react"
import { getPriorityLabel, getStatusLabel } from "../utils/activity";
import type { ReactNode } from "react"

type SearchableFilterOption = {
    value: string
    label: string
}

function SearchableFilterDropdown({
    id,
    label,
    placeholder,
    value,
    valueLabel,
    options,
    onChange,
    searchable = false,
    openDropdownId,
    setOpenDropdownId,
}: {
    id: string
    label: string
    placeholder?: string
    value: string
    valueLabel?: string
    options: SearchableFilterOption[]
    onChange: (value: string) => void
    searchable?: boolean
    openDropdownId: string | null
    setOpenDropdownId: (id: string | null) => void
}) {
    const isOpen = openDropdownId === id
    const [query, setQuery] = useState("")
    const [opensAbove, setOpensAbove] = useState(false)
    const [optionsMaxHeight, setOptionsMaxHeight] = useState(190)
    const fieldRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const searchRef = useRef<HTMLInputElement | null>(null)
    const firstOptionRef = useRef<HTMLButtonElement | null>(null)
    const listboxId = `${id}-options`
    const selectedOption = options.find((option) => option.value === value)
    const displayedValue = selectedOption?.label ?? (value ? valueLabel : undefined) ?? placeholder ?? ""
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const visibleOptions = options.filter((option) =>
        option.label.toLocaleLowerCase().includes(normalizedQuery),
    )
    const visibleOptionCount = visibleOptions.length

    const updatePlacement = useCallback(() => {
        const trigger = triggerRef.current
        if (!trigger) return

        const bounds = trigger.getBoundingClientRect()
        const spaceAbove = Math.max(0, bounds.top - 8)
        const spaceBelow = Math.max(0, window.innerHeight - bounds.bottom - 8)
        const optionRowsHeight = Math.min(190, Math.max(36, visibleOptionCount * 36))
        const estimatedPanelHeight = 64 + optionRowsHeight
        const shouldOpenAbove = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow
        const availableSpace = shouldOpenAbove ? spaceAbove : spaceBelow

        setOpensAbove(shouldOpenAbove)
        setOptionsMaxHeight(Math.max(40, Math.min(190, availableSpace - 64)))
    }, [visibleOptionCount])

    useEffect(() => {
        if (!isOpen) return

        if (searchable) {
            searchRef.current?.focus()
        } else {
            firstOptionRef.current?.focus()
        }

        function handleViewportChange() {
            updatePlacement()
        }

        function handlePointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !fieldRef.current?.contains(event.target)) {
                setOpenDropdownId(null)
                setQuery("")
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpenDropdownId(null)
                setQuery("")
                triggerRef.current?.focus()
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        window.addEventListener("resize", handleViewportChange)
        window.addEventListener("scroll", handleViewportChange, true)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("resize", handleViewportChange)
            window.removeEventListener("scroll", handleViewportChange, true)
        }
    }, [isOpen, searchable, setOpenDropdownId, updatePlacement])

    function selectOption(nextValue: string) {
        onChange(placeholder && value === nextValue ? "" : nextValue)
        setOpenDropdownId(null)
        setQuery("")
        triggerRef.current?.focus()
    }

    return (
        <div className={`activity-filter-field searchable-filter-field${isOpen ? " is-open" : ""}`} ref={fieldRef}>
            <label id={`${id}-label`} htmlFor={id}>{label}</label>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className="searchable-filter-trigger"
                aria-labelledby={`${id}-label ${id}-value`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                onClick={() => {
                    if (isOpen) {
                        setOpenDropdownId(null)
                        setQuery("")
                    } else {
                        setQuery("")
                        updatePlacement()
                        setOpenDropdownId(id)
                    }
                }}
            >
                <span
                    id={`${id}-value`}
                    className={`searchable-filter-value${!value && placeholder ? " is-placeholder" : ""}`}
                >
                    {displayedValue}
                </span>
                <ChevronDown size={16} aria-hidden="true" />
            </button>

            {isOpen && (
                <div className={`searchable-filter-panel${opensAbove ? " is-above" : ""}`}>
                    {searchable && (
                        <div className="searchable-filter-search">
                            <Search size={15} aria-hidden="true" />
                            <input
                                ref={searchRef}
                                type="search"
                                value={query}
                                aria-label={`Search ${label.toLowerCase()} options`}
                                placeholder={`Search ${label.toLowerCase()}...`}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        event.preventDefault()
                                    }
                                }}
                            />
                        </div>
                    )}
                    <div
                        id={listboxId}
                        className="searchable-filter-options"
                        role="listbox"
                        aria-labelledby={`${id}-label`}
                        style={{ maxHeight: `${optionsMaxHeight}px` }}
                    >
                        {visibleOptions.map((option, index) => (
                            <button
                                key={option.value}
                                ref={index === 0 ? firstOptionRef : undefined}
                                type="button"
                                className="searchable-filter-option"
                                role="option"
                                aria-selected={value === option.value}
                                aria-label={value === option.value && placeholder
                                    ? `${option.label}, selected. Activate to clear this filter.`
                                    : option.label}
                                onClick={() => selectOption(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <p className="searchable-filter-empty" role="status">No {label.toLowerCase()} options available.</p>
                        )}
                        {options.length > 0 && visibleOptions.length === 0 && (
                            <p className="searchable-filter-empty" role="status">No matching {label.toLowerCase()} options.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

type ActivityMutation = { kind: "create" | "update" | "delete"; id: string; nonce: number }

function Activities({ onViewDetails, onCreateActivity, onNotify, mutation, isActive, focusActivityId, onFocusActivityChange }: { onViewDetails: (activityId: string) => void; onCreateActivity: () => void; onNotify: (message: string) => void; mutation: ActivityMutation | null; isActive: boolean; focusActivityId: string | null; onFocusActivityChange: (id: string | null) => void }) {
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
    const searchInputRef = useRef<HTMLInputElement | null>(null)
    const activitiesRequestIdRef = useRef(0)
    const processedMutationNonceRef = useRef<number | null>(null)
    const [sortBy, setSortBy] = useState("createdat")
    const [descending, setDescending] = useState(true)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [totalCount, setTotalCount] = useState(0)
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
    const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
    const leaveConfirmTriggerRef = useRef<HTMLElement | null>(null)
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
    const [openFilterDropdownId, setOpenFilterDropdownId] = useState<string | null>(null)
    const [isCancelledSummaryExpanded, setIsCancelledSummaryExpanded] = useState(false)
    const wasListActive = useRef(isActive)
    const shouldRestoreCardFocus = useRef(false)
    const shouldScrollToRestoredCard = useRef(false)

    const summaryCards: {
        title: string
        count: number
        className: string
        status: ActivityStatus | ""
        icon: ReactNode
    }[] = [
        { title: "Total Activities", count: activitySummary?.totalActivities ?? 0, className: "summary-total", status: "", icon: <Layers size={20} aria-hidden="true" /> },
        { title: "Pending", count: activitySummary?.pendingCount ?? 0, className: "summary-pending", status: 1, icon: <Clock3 size={20} aria-hidden="true" /> },
        { title: "In Progress", count: activitySummary?.inProgressCount ?? 0, className: "summary-in-progress", status: 2, icon: <RefreshCw size={20} aria-hidden="true" /> },
        { title: "Completed", count: activitySummary?.completedCount ?? 0, className: "summary-completed", status: 3, icon: <CircleCheck size={20} aria-hidden="true" /> },
    ]

    const cancelledSummaryCard = {
        title: "Cancelled",
        count: activitySummary?.cancelledCount ?? 0,
        className: "summary-cancelled",
        status: 4 as ActivityStatus,
        icon: <CircleX size={20} aria-hidden="true" />,
    }

    function selectSummaryStatus(status: ActivityStatus | "") {
        setStatusFilter((currentStatus) =>
            status !== "" && currentStatus === status ? "" : status,
        )
    }

    function renderSummaryCard(card: (typeof summaryCards)[number] | typeof cancelledSummaryCard) {
        const isSelected = statusFilter === card.status
        const isEmptyStatus = card.status !== "" && card.count === 0

        return (
            <button
                key={card.title}
                type="button"
                className={`summary-card ${card.className}${isSelected ? " is-selected" : ""}`}
                aria-pressed={isSelected}
                disabled={isEmptyStatus}
                onClick={() => selectSummaryStatus(card.status)}
            >
                <span className="summary-card-heading">
                    <span className="summary-icon">{card.icon}</span>
                    <span className="summary-card-label" role="heading" aria-level={3}>{card.title}</span>
                </span>

                {isLoadingSummary && activitySummary === null ? (
                    <span className="summary-value" role="status">Loading...</span>
                ) : summaryError ? (
                    <span className="summary-value" role="alert">{summaryError}</span>
                ) : (
                    <span className="summary-value">{card.count}</span>
                )}

                <span className="summary-selection-slot" aria-hidden={!isSelected}>
                    {isSelected && <><CircleCheck size={15} aria-hidden="true" /><span>Selected</span></>}
                </span>
            </button>
        )
    }
    
    useEffect(() => {
        const timeoutId = window.setTimeout(() => setPage(1), 0)
        return () => window.clearTimeout(timeoutId)
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
        const mutationValue = mutation
        if (!mutationValue || !auth.token || processedMutationNonceRef.current === mutationValue.nonce) return
        processedMutationNonceRef.current = mutationValue.nonce
        const change = mutationValue
        let cancelled = false
        async function locateMutatedRow() {
            try {
                if (change.kind === "delete") {
                    const query = {
                        page: 1,
                        pageSize: 10,
                        ...(statusFilter !== "" && { status: statusFilter }),
                        ...(priorityFilter !== "" && { priority: priorityFilter }),
                        ...(debouncedSearch && { search: debouncedSearch }),
                        sortBy,
                        descending,
                    }
                    const first = await getActivities(auth.token, query)
                    if (cancelled) return

                    const targetPage = Math.max(1, Math.min(page, first.activities.totalPages || 1))
                    const result = targetPage === 1
                        ? first
                        : await getActivities(auth.token, { ...query, page: targetPage })
                    if (cancelled) return

                    const deletedIndex = activities.findIndex(item => item.id === change.id)
                    const fallback = deletedIndex > 0 ? activities[deletedIndex - 1] : activities[1]
                    const focusId = result.activities.items.some(item => item.id === fallback?.id)
                        ? fallback?.id ?? null
                        : result.activities.items.at(-1)?.id ?? null

                    setPage(targetPage)
                    setActivities(result.activities.items)
                    setTotalPages(result.activities.totalPages)
                    setTotalCount(result.activities.totalCount)
                    onFocusActivityChange(focusId)
                    shouldRestoreCardFocus.current = true
                    shouldScrollToRestoredCard.current = true
                    setRefreshDeleteTrigger(previous => previous + 1)
                    return
                }
                const first = await getActivities(auth.token, { page: 1, pageSize: 10, sortBy, descending })
                for (let targetPage = 1; targetPage <= first.activities.totalPages; targetPage += 1) {
                    const result = targetPage === 1 ? first : await getActivities(auth.token, { page: targetPage, pageSize: 10, sortBy, descending })
                    if (cancelled) return
                    if (result.activities.items.some(item => item.id === change.id)) {
                        setPage(targetPage)
                        return
                    }
                }
            } catch {
                // Keep the default first page visible if positioning the changed row fails.
            }
        }
        const timeoutId = window.setTimeout(() => {
          if (change.kind === "delete") {
            void locateMutatedRow()
          } else {
            setRefreshTrigger(previous => previous + 1)
            setSearch("")
            setDebouncedSearch("")
            setStatusFilter("")
            setPriorityFilter("")
            setOpenFilterDropdownId(null)
            setPage(1)
            void locateMutatedRow()
          }
        }, 0)
        return () => { cancelled = true; window.clearTimeout(timeoutId) }
    }, [mutation, auth.token, sortBy, descending, activities, page, onFocusActivityChange])

    useEffect(() => {
        if (!selectedActivityId) return
        
        loadSelectedActivity(auth.token, selectedActivityId)
    }, [auth.token, selectedActivityId])

    useEffect(() => {
        if (isActive && !wasListActive.current) shouldRestoreCardFocus.current = true
        wasListActive.current = isActive
        if (!isActive || !shouldRestoreCardFocus.current || isLoadingActivities) return
        const frame = requestAnimationFrame(() => {
            const cards = Array.from(document.querySelectorAll<HTMLElement>(".activity-card--clickable"))
            const target = cards.find(card => card.dataset.activityId === focusActivityId) ?? cards[0]
            if (target) target.focus({ preventScroll: !shouldScrollToRestoredCard.current })
            else document.querySelector<HTMLElement>(".activity-list-header h2")?.focus({ preventScroll: true })
            shouldRestoreCardFocus.current = false
            shouldScrollToRestoredCard.current = false
        })
        return () => cancelAnimationFrame(frame)
    }, [isActive, focusActivityId, isLoadingActivities, activities])

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
        const requestId = ++activitiesRequestIdRef.current

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

            if (requestId !== activitiesRequestIdRef.current) return

            if (statusFilter !== "" && !data.availableStatuses.includes(statusFilter)) {
                setStatusFilter("")
            }
            if (priorityFilter !== "" && !data.availablePriorities.includes(priorityFilter)) {
                setPriorityFilter("")
            }

            setActivities(data.activities.items)
            setTotalPages(data.activities.totalPages)
            setTotalCount(data.activities.totalCount)
            setAvailableStatuses(data.availableStatuses)
            setAvailablePriorities(data.availablePriorities)
            setHasLoadedActivities(true)
            
        } catch {
            if (requestId === activitiesRequestIdRef.current) {
                setActivitiesError("Failed to load activities.")
            }
        } finally {
            if (requestId === activitiesRequestIdRef.current) {
                setIsLoadingActivities(false)
            }
        }        
    }

    async function loadActivitySummary(token: string) {
        if (!token) return

        setSummaryError(null)
        setIsLoadingSummary(true)

        try {
            const [data, cancelledActivities] = await Promise.all([
                getActivitySummary(token),
                getActivities(token, { page: 1, pageSize: 1, status: 4 }),
            ])

            setActivitySummary({
                ...data,
                cancelledCount: cancelledActivities.activities.totalCount,
            })
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

    function handleActivityUpdated() {
        pendingEditFocusRef.current = true
        setRefreshUpdateTrigger(prev => prev + 1)
        setSelectedActivityId(null)
        setSelectedActivity(null)
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
            leaveConfirmTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            setIsLeaveConfirmOpen(true)
            return
        }

        setHasUnsavedChanges(false)
        setSelectedActivity(null)
        setSelectedActivityId(null)
    }

    function confirmLeaveEdit() {
        setIsLeaveConfirmOpen(false)
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

            onNotify("Activity deleted successfully")
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
        void trigger
        onCreateActivity()
    }

    function handleCloseCreateModal() {
        setIsCreateModalOpen(false)
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
                        <button
                            type="button"
                            className="create-activity-button"
                            onClick={(event) =>
                                handleOpenCreateModal(event.currentTarget)
                            }
                        >
                            + Create Activity
                        </button>
                    )}
                </div>
            </header>

            <div className="activity-summary">
                <h2 className="activity-summary-title">Activity Summary</h2>
                <div className="summary-primary-grid">
                    {summaryCards.map(renderSummaryCard)}
                </div>

                <button
                    type="button"
                    className="summary-expand-toggle"
                    aria-label={isCancelledSummaryExpanded ? "Hide Cancelled summary" : "Show Cancelled summary"}
                    aria-expanded={isCancelledSummaryExpanded}
                    aria-controls="cancelled-summary-row"
                    title={isCancelledSummaryExpanded ? "Hide Cancelled summary" : "Show Cancelled summary"}
                    onClick={() => {
                        if (isCancelledSummaryExpanded && statusFilter === 4) {
                            setStatusFilter("")
                        }
                        setIsCancelledSummaryExpanded((expanded) => !expanded)
                    }}
                >
                    {isCancelledSummaryExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                </button>

                <div
                    id="cancelled-summary-row"
                    className="summary-cancelled-grid"
                    hidden={!isCancelledSummaryExpanded}
                >
                    {renderSummaryCard(cancelledSummaryCard)}
                </div>
            </div>

            {summaryError && (
                <p role="alert">{summaryError}</p>
            )}

            
            {isFiltersOpen && (
                <div className="activities-filters" id="activity-filters">
                    <SearchableFilterDropdown
                        id="activity-status-filter"
                        label="Status"
                        placeholder="Select status"
                        value={statusFilter === "" ? "" : String(statusFilter)}
                        valueLabel={statusFilter === "" ? undefined : getStatusLabel(statusFilter)}
                        options={availableStatuses.map((status) => ({
                            value: String(status),
                            label: getStatusLabel(status),
                        }))}
                        searchable
                        openDropdownId={openFilterDropdownId}
                        setOpenDropdownId={setOpenFilterDropdownId}
                        onChange={(value) => {
                            const nextStatus = value === "" ? "" : Number(value) as ActivityStatus
                            setStatusFilter(nextStatus)
                            if (nextStatus === 4) {
                                setIsCancelledSummaryExpanded(true)
                            }
                            setPage(1)
                        }}
                    />

                    <SearchableFilterDropdown
                        id="activity-priority-filter"
                        label="Priority"
                        placeholder="Select priority"
                        value={priorityFilter === "" ? "" : String(priorityFilter)}
                        valueLabel={priorityFilter === "" ? undefined : getPriorityLabel(priorityFilter)}
                        options={availablePriorities.map((priority) => ({
                            value: String(priority),
                            label: getPriorityLabel(priority),
                        }))}
                        searchable
                        openDropdownId={openFilterDropdownId}
                        setOpenDropdownId={setOpenFilterDropdownId}
                        onChange={(value) => {
                            setPriorityFilter(
                                value === "" ? "" : Number(value) as ActivityPriority
                            )
                            setPage(1)
                        }}
                    />

                    <SearchableFilterDropdown
                        id="activity-sort-by"
                        label="Sort by"
                        value={sortBy}
                        options={[
                            { value: "createdat", label: "Date created" },
                            { value: "activitydate", label: "Activity date" },
                            { value: "title", label: "Title" },
                            { value: "status", label: "Status" },
                            { value: "priority", label: "Priority" },
                        ]}
                        openDropdownId={openFilterDropdownId}
                        setOpenDropdownId={setOpenFilterDropdownId}
                        onChange={(value) => {
                            setSortBy(value)
                            setPage(1)
                        }}
                    />

                    <SearchableFilterDropdown
                        id="activity-sort-order"
                        label="Sort order"
                        value={descending ? "desc" : "asc"}
                        options={[
                            { value: "desc", label: "Descending" },
                            { value: "asc", label: "Ascending" },
                        ]}
                        openDropdownId={openFilterDropdownId}
                        setOpenDropdownId={setOpenFilterDropdownId}
                        onChange={(value) => {
                            setDescending(value === "desc")
                            setPage(1)
                        }}
                    />

                    <div className="activity-filter-actions">
                        <button
                            type="button"
                            className="filter-clear-button"
                            onClick={() => {
                                setStatusFilter("")
                                setPriorityFilter("")
                                setSortBy("createdat")
                                setDescending(true)
                                setOpenFilterDropdownId(null)
                                setPage(1)
                            }}
                            disabled={
                                statusFilter === "" &&
                                priorityFilter === "" &&
                                sortBy === "createdat" &&
                                descending
                            }
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
                <div className="activity-list-heading-group">
                    <h2 tabIndex={-1}>Activities List</h2>
                    <p className="activity-list-context">
                        <Filter size={14} aria-hidden="true" />
                        <span>
                            {statusFilter === ""
                                ? search.trim() || priorityFilter !== ""
                                    ? "Showing activities matching the active filters"
                                    : "Showing all activities"
                                : `Showing activities with status: ${getStatusLabel(statusFilter)}`}
                            {hasLoadedActivities && !isLoadingActivities && !activitiesError && (
                                <> · {totalCount} {totalCount === 1 ? "activity" : "activities"}</>
                            )}
                        </span>
                    </p>
                </div>

                <div className="activity-search">
                    <Search size={18} className="activity-search-icon" aria-hidden="true" />
                    <input
                        ref={searchInputRef}
                        type="search"
                        name="search"
                        aria-label="Search activities"
                        placeholder="Search activities..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value)
                            setPage(1)
                        }}
                    />
                    {search !== "" && (
                        <button
                            type="button"
                            className="activity-search-clear"
                            aria-label="Clear search"
                            onClick={() => {
                                setSearch("")
                                setPage(1)
                                searchInputRef.current?.focus()
                            }}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="filter-toggle-button"
                    aria-label={isFiltersOpen ? "Hide filters" : "Show filters"}
                    aria-expanded={isFiltersOpen}
                    aria-controls="activity-filters"
                    onClick={() => {
                        if (isFiltersOpen) {
                            setOpenFilterDropdownId(null)
                        }
                        setIsFiltersOpen((open) => !open)
                    }}
                >
                    <SlidersHorizontal size={20} aria-hidden="true" />
                </button>
            </header>

            {!hasLoadedActivities || (isLoadingActivities && activities.length === 0) ? (
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
                (activitySummary?.totalActivities ?? totalCount) === 0 ? (
                    <EmptyState onOpenCreateModal={handleOpenCreateModal} />
                ) : (
                    <section className="empty-state" aria-labelledby="empty-matches-title">
                        <h2 id="empty-matches-title">No matching activities</h2>
                        <p className="empty-state-description">No activities match your search or filters.</p>
                        <button type="button" className="empty-state-button" onClick={() => {
                            setSearch("")
                            setStatusFilter("")
                            setPriorityFilter("")
                            setPage(1)
                        }}>Clear search and filters</button>
                    </section>
                )
            ) : (
                <ActivityList
                    activities={activities}
                    onViewDetails={onViewDetails}
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
            <ConfirmDialog
                isOpen={isLeaveConfirmOpen}
                title="Discard changes?"
                message="You have unsaved changes. Do you want to discard them and leave?"
                confirmLabel="Discard changes"
                onCancel={() => setIsLeaveConfirmOpen(false)}
                onConfirm={confirmLeaveEdit}
                triggerButton={leaveConfirmTriggerRef.current}
            />
            
            {totalPages > 0 && <nav className="activity-pagination" aria-label="Activities pages">
                <ul className="pagination-content">
                    <li className="pagination-item">
                        <button
                            type="button"
                            className="pagination-link pagination-link--nav"
                            aria-label="Previous page"
                            disabled={page === 1 || isLoadingActivities}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft aria-hidden="true" />
                            <span>Previous</span>
                        </button>
                    </li>

                    {paginationItems.map((item) =>
                        typeof item === "number" ? (
                            <li className="pagination-item" key={item}>
                                <button
                                    type="button"
                                    className="pagination-link"
                                    aria-current={item === page ? "page" : undefined}
                                    disabled={isLoadingActivities}
                                    onClick={() => setPage(item)}
                                >
                                    {item}
                                </button>
                            </li>
                        ) : (
                            <li className="pagination-item" key={item}>
                                <span className="pagination-ellipsis" aria-hidden="true">
                                    …
                                </span>
                            </li>
                        )
                    )}

                    <li className="pagination-item">
                        <button
                            type="button"
                            className="pagination-link pagination-link--nav"
                            aria-label="Next page"
                            disabled={
                                page === totalPages || isLoadingActivities
                            }
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <span>Next</span>
                            <ChevronRight aria-hidden="true" />
                        </button>
                    </li>
                </ul>
            </nav>}
        </section>
    )
}

export default Activities

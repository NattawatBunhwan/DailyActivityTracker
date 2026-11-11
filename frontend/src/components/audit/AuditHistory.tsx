import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from "react"
import {
    History,
    RefreshCw,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Search,
    CalendarDays,
    Eye,
    ShieldAlert,
    Clock,
} from "lucide-react"
import type {
    AuditFilterOptionsResponse,
    AuditLogQuery,
    AuditLogResponse,
    AuditUserOption,
    PagedAuditLogsResponse,
} from "../../types/audit"
import { AuditCategory } from "../../types/audit"
import { getAdminAuditFilterOptions, getAdminAuditLogs } from "../../api/auditApi"
import useAuth from "../../hooks/useAuth"
import { isUserAdmin } from "../../utils/jwt"
import { AuditLogDetailsModal } from "./AuditLogDetailsModal"
import "./AuditHistory.css"

const KNOWN_AUTH_ACTIONS = [
    "LoginFailed",
    "LoginSucceeded",
    "LogoutSucceeded",
    "TokenRefreshFailed",
    "TokenRefreshSucceeded",
]

const KNOWN_DATA_ACTIONS = [
    "ActivityCreated",
    "ActivityDeleted",
    "ActivityUpdated",
]

type SearchableFilterOption = {
    value: string
    label: string
    searchTerms?: string[]
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
    const visibleOptions = options.filter((option) => {
        if (option.label.toLocaleLowerCase().includes(normalizedQuery)) {
            return true
        }
        if (option.searchTerms) {
            return option.searchTerms.some((term) =>
                term.toLocaleLowerCase().includes(normalizedQuery)
            )
        }
        return false
    })
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
        <div
            className={`activity-filter-field searchable-filter-field${isOpen ? " is-open" : ""}`}
            ref={fieldRef}
        >
            <label id={`${id}-label`} htmlFor={id}>
                {label}
            </label>
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
                                aria-label={
                                    value === option.value && placeholder
                                        ? `${option.label}, selected. Activate to clear this filter.`
                                        : option.label
                                }
                                onClick={() => selectOption(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <p className="searchable-filter-empty" role="status">
                                No {label.toLowerCase()} options available.
                            </p>
                        )}
                        {options.length > 0 && visibleOptions.length === 0 && (
                            <p className="searchable-filter-empty" role="status">
                                No matching {label.toLowerCase()} options.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function AuditDateFilterField({
    id,
    label,
    placeholder,
    value,
    onChange,
    openDropdownId,
    setOpenDropdownId,
}: {
    id: string
    label: string
    placeholder: string
    value: string
    onChange: (value: string) => void
    openDropdownId: string | null
    setOpenDropdownId: (id: string | null) => void
}) {
    const open = openDropdownId === id
    const [monthOpen, setMonthOpen] = useState(false)
    const [yearOpen, setYearOpen] = useState(false)
    const yearListRef = useRef<HTMLDivElement>(null)
    const monthListRef = useRef<HTMLDivElement>(null)
    const [month, setMonth] = useState(() => {
        const date = value ? new Date(`${value}T12:00:00`) : new Date()
        return Number.isNaN(date.getTime())
            ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            : new Date(date.getFullYear(), date.getMonth(), 1)
    })
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const pad = (number: number) => String(number).padStart(2, "0")
    const today = new Date()
    const todayDateString = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const selectedDate = value ? new Date(`${value}T12:00:00`) : null
    const isValidSelectedDate = selectedDate !== null && !Number.isNaN(selectedDate.getTime())
    const currentYear = new Date().getFullYear()
    const minYear = currentYear - 7
    const maxYear = currentYear + 3
    const weekdays = Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, 7 + index))
    )
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index)

    useEffect(() => {
        if (!open) return
        const closeOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setOpenDropdownId(null)
                setMonthOpen(false)
                setYearOpen(false)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenDropdownId(null)
                setMonthOpen(false)
                setYearOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener("pointerdown", closeOutside)
        document.addEventListener("keydown", closeOnEscape)
        return () => {
            document.removeEventListener("pointerdown", closeOutside)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [open, setOpenDropdownId])

    useEffect(() => {
        if (yearOpen && yearListRef.current) {
            const selectedIndex = month.getFullYear() - minYear
            yearListRef.current.scrollTop = Math.max(0, selectedIndex * 30 - 60)
        }
        if (monthOpen && monthListRef.current) {
            monthListRef.current.scrollTop = Math.max(0, month.getMonth() * 32 - 64)
        }
    }, [yearOpen, monthOpen, month, minYear])

    function changeMonth(offset: number) {
        const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1)
        if (nextMonth.getFullYear() >= minYear && nextMonth.getFullYear() <= maxYear) setMonth(nextMonth)
    }

    const displayedText = isValidSelectedDate
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(selectedDate)
        : placeholder

    return (
        <div
            className={`activity-filter-field editor-date-picker audit-date-filter-field${open ? " is-open" : ""}`}
            ref={rootRef}
        >
            <label id={`${id}-label`} htmlFor={id}>
                {label}
            </label>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className="editor-date-trigger searchable-filter-trigger"
                aria-labelledby={`${id}-label ${id}-value`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    if (open) {
                        setMonthOpen(false)
                        setYearOpen(false)
                        setOpenDropdownId(null)
                    } else {
                        if (value) {
                            const parsed = new Date(`${value}T12:00:00`)
                            if (!Number.isNaN(parsed.getTime())) {
                                setMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
                            } else {
                                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                            }
                        } else {
                            setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                        }
                        setMonthOpen(false)
                        setYearOpen(false)
                        setOpenDropdownId(id)
                    }
                }}
            >
                <span
                    id={`${id}-value`}
                    className={`searchable-filter-value${!isValidSelectedDate ? " is-placeholder" : ""}`}
                >
                    {displayedText}
                </span>
                <CalendarDays size={16} aria-hidden="true" />
            </button>
            {open && (
                <div
                    className="editor-calendar-panel audit-calendar-panel"
                    role="dialog"
                    aria-label={`Choose ${label.toLowerCase()}`}
                >
                    <div className="editor-calendar-header">
                        <button
                            type="button"
                            aria-label="Previous month"
                            disabled={month.getFullYear() === minYear && month.getMonth() === 0}
                            onClick={() => changeMonth(-1)}
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <div className="editor-calendar-selects">
                            <div className="editor-month-picker">
                                <button
                                    type="button"
                                    className="editor-month-trigger"
                                    aria-label="Choose month"
                                    aria-haspopup="listbox"
                                    aria-expanded={monthOpen}
                                    onClick={() => {
                                        setMonthOpen((current) => !current)
                                        setYearOpen(false)
                                    }}
                                >
                                    {new Intl.DateTimeFormat(undefined, { month: "long" }).format(month)}
                                </button>
                                {monthOpen && (
                                    <div
                                        className="editor-month-list"
                                        role="listbox"
                                        aria-label="Choose month"
                                        ref={monthListRef}
                                    >
                                        {Array.from({ length: 12 }, (_, index) => (
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={month.getMonth() === index}
                                                className={month.getMonth() === index ? "is-selected" : ""}
                                                key={index}
                                                onClick={() => {
                                                    setMonth(new Date(month.getFullYear(), index, 1))
                                                    setMonthOpen(false)
                                                }}
                                            >
                                                {new Intl.DateTimeFormat(undefined, { month: "long" }).format(
                                                    new Date(2024, index, 1)
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="editor-year-picker">
                                <button
                                    type="button"
                                    className="editor-year-trigger"
                                    aria-label="Choose year"
                                    aria-haspopup="listbox"
                                    aria-expanded={yearOpen}
                                    onClick={() => {
                                        setYearOpen((current) => !current)
                                        setMonthOpen(false)
                                    }}
                                >
                                    {month.getFullYear()}
                                </button>
                                {yearOpen && (
                                    <div
                                        className="editor-year-list"
                                        role="listbox"
                                        aria-label="Choose year"
                                        ref={yearListRef}
                                    >
                                        {years.map((year) => (
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={month.getFullYear() === year}
                                                className={month.getFullYear() === year ? "is-selected" : ""}
                                                key={year}
                                                onClick={() => {
                                                    setMonth(new Date(year, month.getMonth(), 1))
                                                    setYearOpen(false)
                                                }}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Next month"
                            disabled={month.getFullYear() === maxYear && month.getMonth() === 11}
                            onClick={() => changeMonth(1)}
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                    <div className="editor-calendar-grid" role="grid">
                        {weekdays.map((day, index) => (
                            <span className="editor-calendar-weekday" key={`${day}-${index}`}>
                                {day}
                            </span>
                        ))}
                        {Array.from({ length: firstDay }, (_, index) => (
                            <span className="editor-calendar-empty" key={`empty-${index}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, index) => {
                            const day = index + 1
                            const dateValue = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(day)}`
                            const selected = dateValue === value
                            const isToday = dateValue === todayDateString
                            return (
                                <button
                                    type="button"
                                    role="gridcell"
                                    aria-selected={selected}
                                    aria-current={isToday ? "date" : undefined}
                                    className={`editor-calendar-day${selected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                                    key={dateValue}
                                    onClick={() => {
                                        onChange(selected ? "" : dateValue)
                                        setOpenDropdownId(null)
                                        triggerRef.current?.focus()
                                    }}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                    {value && (
                        <div className="audit-calendar-footer">
                            <button
                                type="button"
                                className="audit-calendar-clear"
                                onClick={() => {
                                    onChange("")
                                    setOpenDropdownId(null)
                                    triggerRef.current?.focus()
                                }}
                            >
                                Clear date
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function isDeletedActor(log: AuditLogResponse): boolean {
    if (log.isDeletedUser) return true
    if (log.actorRole?.trim().toLowerCase() === "deleted user") return true
    if (
        !log.userId &&
        Boolean(log.actorEmail?.trim()) &&
        log.action !== "LoginFailed" &&
        log.action !== "TokenRefreshFailed"
    ) {
        return true
    }
    return false
}

function formatUserOptionLabel(user: AuditUserOption): string {
    const emailPart = user.email?.trim()
    const namePart = user.displayName?.trim()
    const suffix = user.isDeleted ? " (Deleted User)" : ""

    if (emailPart && namePart) {
        return `${emailPart} (${namePart})${suffix}`
    }
    if (emailPart) {
        return `${emailPart}${suffix}`
    }
    if (namePart) {
        return `${namePart}${suffix}`
    }
    return `${user.userId}${suffix}`
}

export default function AuditHistory() {
    const auth = useAuth()
    const isAdmin = isUserAdmin(auth.token)

    // Filter states
    const [categoryFilter, setCategoryFilter] = useState<string>("")
    const [actionFilter, setActionFilter] = useState<string>("")
    const [userIdFilter, setUserIdFilter] = useState<string>("")
    const [fromDate, setFromDate] = useState<string>("")
    const [toDate, setToDate] = useState<string>("")
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

    // Pagination states
    const [page, setPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(20)

    // Data states
    const [data, setData] = useState<PagedAuditLogsResponse | null>(null)
    const [filterMetadata, setFilterMetadata] = useState<AuditFilterOptionsResponse | null>(null)
    const [observedActions, setObservedActions] = useState<string[]>([])
    const [observedUsers, setObservedUsers] = useState<AuditUserOption[]>([])
    const [loading, setLoading] = useState<boolean>(() => Boolean(isAdmin && auth.token))
    const [error, setError] = useState<string | null>(null)
    const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null)
    const [detailTriggerElement, setDetailTriggerElement] = useState<HTMLElement | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

    // Request sequence ID to prevent out-of-order responses from overwriting newer requests
    const latestRequestIdRef = useRef<number>(0)
    const latestFilterRequestIdRef = useRef<number>(0)

    // Pending transition state for filter application
    const [, startTransition] = useTransition()

    useEffect(() => {
        let isMounted = true

        if (!isAdmin || !auth.token) {
            return
        }

        const currentFilterRequestId = ++latestFilterRequestIdRef.current

        const queryParams: { category?: AuditCategory; action?: string } = {}
        if (categoryFilter === "1") {
            queryParams.category = AuditCategory.Authentication
        } else if (categoryFilter === "2") {
            queryParams.category = AuditCategory.Data
        }
        if (actionFilter.trim()) {
            queryParams.action = actionFilter.trim()
        }

        void (async () => {
            try {
                const metadata = await getAdminAuditFilterOptions(auth.token, queryParams)
                if (isMounted && currentFilterRequestId === latestFilterRequestIdRef.current && metadata) {
                    setFilterMetadata(metadata)
                }
            } catch {
                // Keep existing filter options if available
            }
        })()

        return () => {
            isMounted = false
        }
    }, [auth.token, isAdmin, categoryFilter, actionFilter])

    const beginRequestState = () => {
        if (isAdmin && auth.token) {
            setLoading(true)
            setError(null)
        }
    }

    useEffect(() => {
        let isMounted = true

        if (!isAdmin || !auth.token) {
            return
        }

        const currentRequestId = ++latestRequestIdRef.current

        const query: AuditLogQuery = {
            page,
            pageSize,
        }

        if (categoryFilter === "1") {
            query.category = AuditCategory.Authentication
        } else if (categoryFilter === "2") {
            query.category = AuditCategory.Data
        }

        if (actionFilter.trim()) {
            query.action = actionFilter.trim()
        }

        if (userIdFilter.trim()) {
            query.userId = userIdFilter.trim()
        }

        if (fromDate.trim()) {
            query.from = fromDate.trim()
        }

        if (toDate.trim()) {
            query.to = toDate.trim()
        }

        void (async () => {
            try {
                const response = await getAdminAuditLogs(auth.token, query)
                if (isMounted && currentRequestId === latestRequestIdRef.current) {
                    setData(response)
                    setError(null)
                    setLoading(false)

                    if (response?.items?.length) {
                        setObservedActions((prev) => {
                            const next = new Set(prev)
                            for (const item of response.items) {
                                if (item.action?.trim()) {
                                    next.add(item.action.trim())
                                }
                            }
                            return Array.from(next)
                        })

                        setObservedUsers((prev) => {
                            const map = new Map(prev.map((u) => [u.userId, u]))
                            for (const item of response.items) {
                                if (item.userId?.trim()) {
                                    const uid = item.userId.trim()
                                    if (!map.has(uid)) {
                                        map.set(uid, {
                                            userId: uid,
                                            email: item.actorEmail,
                                            role: item.actorRole,
                                            isDeleted: isDeletedActor(item),
                                        })
                                    }
                                }
                            }
                            return Array.from(map.values())
                        })
                    }
                }
            } catch (err: unknown) {
                if (isMounted && currentRequestId === latestRequestIdRef.current) {
                    const message = err instanceof Error ? err.message : "Failed to load audit logs"
                    setError(message)
                    setLoading(false)
                }
            }
        })()

        return () => {
            isMounted = false
        }
    }, [
        auth.token,
        isAdmin,
        page,
        pageSize,
        categoryFilter,
        actionFilter,
        userIdFilter,
        fromDate,
        toDate,
        refreshTrigger,
    ])

    const categoryOptions = useMemo<SearchableFilterOption[]>(() => {
        const allCategories: SearchableFilterOption[] = [
            { value: "1", label: "Authentication" },
            { value: "2", label: "Data" },
        ]

        const trimmedAction = actionFilter.trim()
        if (!trimmedAction) {
            return allCategories
        }

        if (KNOWN_AUTH_ACTIONS.includes(trimmedAction)) {
            return allCategories.filter((c) => c.value === "1")
        }

        if (KNOWN_DATA_ACTIONS.includes(trimmedAction)) {
            return allCategories.filter((c) => c.value === "2")
        }

        return allCategories
    }, [actionFilter])

    const actionOptions = useMemo<SearchableFilterOption[]>(() => {
        const merged = new Set<string>()

        // Determine effective category to scope actions to:
        // 1. Explicitly selected categoryFilter
        // 2. Or if categoryFilter is not set yet, infer from currently selected actionFilter
        const effectiveCategory =
            categoryFilter ||
            (actionFilter.trim() && KNOWN_AUTH_ACTIONS.includes(actionFilter.trim())
                ? "1"
                : actionFilter.trim() && KNOWN_DATA_ACTIONS.includes(actionFilter.trim())
                  ? "2"
                  : "")

        if (filterMetadata) {
            for (const act of filterMetadata.actions) {
                if (act?.trim()) {
                    const trimmed = act.trim()
                    if (effectiveCategory === "1" && !KNOWN_AUTH_ACTIONS.includes(trimmed)) {
                        continue
                    }
                    if (effectiveCategory === "2" && !KNOWN_DATA_ACTIONS.includes(trimmed)) {
                        continue
                    }
                    merged.add(trimmed)
                }
            }
        } else {
            // Only before initial metadata load or if API call fails, fall back to observed audit actions
            for (const act of observedActions) {
                if (act?.trim()) {
                    const trimmed = act.trim()
                    if (effectiveCategory === "1" && !KNOWN_AUTH_ACTIONS.includes(trimmed)) {
                        continue
                    }
                    if (effectiveCategory === "2" && !KNOWN_DATA_ACTIONS.includes(trimmed)) {
                        continue
                    }
                    merged.add(trimmed)
                }
            }
        }

        return Array.from(merged)
            .sort((a, b) => a.localeCompare(b))
            .map((action) => ({
                value: action,
                label: action,
            }))
    }, [filterMetadata, observedActions, categoryFilter, actionFilter])

    const userOptions = useMemo<SearchableFilterOption[]>(() => {
        const byId = new Map<string, AuditUserOption>()
        if (filterMetadata) {
            for (const u of filterMetadata.users) {
                if (u?.userId) {
                    byId.set(u.userId, u)
                }
            }
        } else {
            // Only when filterMetadata hasn't loaded yet, fall back to observed users
            for (const u of observedUsers) {
                if (u?.userId && !byId.has(u.userId)) {
                    byId.set(u.userId, u)
                }
            }
        }

        return Array.from(byId.values()).map((u) => {
            const searchTerms: string[] = [u.userId]
            if (u.email?.trim()) {
                searchTerms.push(u.email.trim())
            }
            if (u.displayName?.trim()) {
                searchTerms.push(u.displayName.trim())
            }

            return {
                value: u.userId,
                label: formatUserOptionLabel(u),
                searchTerms,
            }
        })
    }, [filterMetadata, observedUsers])

    if (!isAdmin) {
        return (
            <div className="audit-history">
                <div className="audit-state-box audit-error-box" role="alert">
                    <div className="audit-state-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                        <ShieldAlert size={28} aria-hidden="true" />
                    </div>
                    <h2 className="audit-state-title">Access Denied</h2>
                    <p className="audit-state-text">
                        You do not have permission to view the audit history. Administrator access is required.
                    </p>
                </div>
            </div>
        )
    }

    const handleResetFilters = () => {
        beginRequestState()
        setCategoryFilter("")
        setActionFilter("")
        setUserIdFilter("")
        setFromDate("")
        setToDate("")
        setOpenDropdownId(null)
        setPage(1)
        setPageSize(20)
    }

    const handleCategoryChange = (val: string) => {
        beginRequestState()
        startTransition(() => {
            setCategoryFilter(val)
            setPage(1)
            // Clear incompatible Action and User
            if (actionFilter) {
                const isAuthAction = KNOWN_AUTH_ACTIONS.includes(actionFilter)
                const isDataAction = KNOWN_DATA_ACTIONS.includes(actionFilter)
                if ((val === "1" && !isAuthAction) || (val === "2" && !isDataAction)) {
                    setActionFilter("")
                }
            }
            setUserIdFilter("")
        })
    }

    const handleActionChange = (val: string) => {
        beginRequestState()
        startTransition(() => {
            setActionFilter(val)
            setPage(1)
            const trimmed = val.trim()
            if (trimmed) {
                if (KNOWN_AUTH_ACTIONS.includes(trimmed) && categoryFilter !== "1") {
                    setCategoryFilter("1")
                } else if (KNOWN_DATA_ACTIONS.includes(trimmed) && categoryFilter !== "2") {
                    setCategoryFilter("2")
                }
            }
            // Clear User on action change to ensure consistency with new action
            setUserIdFilter("")
        })
    }

    const handleUserIdChange = (val: string) => {
        beginRequestState()
        startTransition(() => {
            setUserIdFilter(val)
            setPage(1)
        })
    }

    const handleFromDateChange = (val: string) => {
        beginRequestState()
        startTransition(() => {
            setFromDate(val)
            setPage(1)
        })
    }

    const handleToDateChange = (val: string) => {
        beginRequestState()
        startTransition(() => {
            setToDate(val)
            setPage(1)
        })
    }

    const handlePageSizeChange = (val: number) => {
        beginRequestState()
        setPageSize(val)
        setPage(1)
    }

    const formatTimestamp = (utcString: string) => {
        try {
            return new Date(utcString).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            })
        } catch {
            return utcString
        }
    }

    const getCategoryBadge = (category: AuditCategory) => {
        switch (category) {
            case AuditCategory.Authentication:
                return <span className="audit-badge audit-badge-auth">Auth</span>
            case AuditCategory.Data:
                return <span className="audit-badge audit-badge-data">Data</span>
            default:
                return <span className="audit-badge audit-badge-default">{category}</span>
        }
    }

    const getActionBadge = (action: string) => {
        let variantClass = "audit-badge-default"
        switch (action) {
            case "LoginSucceeded":
            case "TokenRefreshSucceeded":
            case "ActivityCreated":
            case "Created":
                variantClass = "audit-badge-action-success"
                break
            case "LoginFailed":
            case "TokenRefreshFailed":
            case "ActivityDeleted":
            case "Deleted":
                variantClass = "audit-badge-action-danger"
                break
            case "ActivityUpdated":
            case "Updated":
                variantClass = "audit-badge-action-warning"
                break
            case "LogoutSucceeded":
                variantClass = "audit-badge-action-info"
                break
        }
        return <span className={`audit-badge ${variantClass}`}>{action}</span>
    }

    const renderActorBadge = (log: AuditLogResponse) => {
        const deleted = isDeletedActor(log)
        const role = log.actorRole?.trim()

        if (deleted) {
            return <span className="audit-badge audit-role-badge--deleted">Deleted User</span>
        }

        if (!role || role.toLowerCase() === "none" || role.toLowerCase() === "null") {
            return null
        }

        const roleClass =
            role.toLowerCase() === "admin"
                ? "audit-role-badge--admin"
                : role.toLowerCase() === "user"
                  ? "audit-role-badge--user"
                  : "audit-badge-default"

        return <span className={`audit-badge ${roleClass}`}>{role}</span>
    }

    const hasPreviousPage = data ? (data.hasPreviousPage ?? data.page > 1) : false
    const hasNextPage = data ? (data.hasNextPage ?? data.page < data.totalPages) : false

    const hasActiveFilters =
        categoryFilter !== "" ||
        actionFilter !== "" ||
        userIdFilter !== "" ||
        fromDate !== "" ||
        toDate !== "" ||
        page !== 1 ||
        pageSize !== 20

    return (
        <section className="audit-history" aria-labelledby="audit-heading">
            <div className="audit-header">
                <div>
                    <h1 id="audit-heading" className="audit-header-title">
                        Audit Logs
                    </h1>
                    <p className="audit-header-subtitle">
                        Inspect security, authentication, and data modification events.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="audit-filters-container">
                <div className="audit-filters-selects-row">
                    <SearchableFilterDropdown
                        id="audit-filter-category"
                        label="Category"
                        placeholder="Select category"
                        value={categoryFilter}
                        options={categoryOptions}
                        onChange={handleCategoryChange}
                        openDropdownId={openDropdownId}
                        setOpenDropdownId={setOpenDropdownId}
                    />

                    <SearchableFilterDropdown
                        id="audit-filter-action"
                        label="Action"
                        placeholder="Select action"
                        value={actionFilter}
                        valueLabel={actionFilter}
                        options={actionOptions}
                        searchable
                        onChange={handleActionChange}
                        openDropdownId={openDropdownId}
                        setOpenDropdownId={setOpenDropdownId}
                    />

                    <SearchableFilterDropdown
                        id="audit-filter-user"
                        label="User"
                        placeholder="Select user"
                        value={userIdFilter}
                        valueLabel={userIdFilter}
                        options={userOptions}
                        searchable
                        onChange={handleUserIdChange}
                        openDropdownId={openDropdownId}
                        setOpenDropdownId={setOpenDropdownId}
                    />
                </div>

                <div className="audit-filters-dates-row">
                    <AuditDateFilterField
                        id="audit-filter-from"
                        label="From Date"
                        placeholder="Select from date"
                        value={fromDate}
                        onChange={handleFromDateChange}
                        openDropdownId={openDropdownId}
                        setOpenDropdownId={setOpenDropdownId}
                    />

                    <AuditDateFilterField
                        id="audit-filter-to"
                        label="To Date"
                        placeholder="Select to date"
                        value={toDate}
                        onChange={handleToDateChange}
                        openDropdownId={openDropdownId}
                        setOpenDropdownId={setOpenDropdownId}
                    />
                </div>

                <div className="activity-filter-actions audit-filter-reset-row">
                    <button
                        type="button"
                        className="filter-clear-button"
                        onClick={handleResetFilters}
                        disabled={!hasActiveFilters}
                        title="Reset all filters"
                    >
                        <RotateCcw size={14} aria-hidden="true" style={{ marginRight: "6px" }} />
                        <span>Reset Filters</span>
                    </button>
                </div>
            </div>

            {/* Summary Bar */}
            {!error && (
                <div className="audit-summary-bar">
                    <span>
                        {loading ? (
                            "Loading logs..."
                        ) : data ? (
                            <>
                                Showing{" "}
                                <span className="audit-summary-count">
                                    {data.items.length > 0 ? (data.page - 1) * data.pageSize + 1 : 0}
                                </span>{" "}
                                to{" "}
                                <span className="audit-summary-count">
                                    {Math.min(data.page * data.pageSize, data.totalCount)}
                                </span>{" "}
                                of <span className="audit-summary-count">{data.totalCount}</span> logs
                            </>
                        ) : (
                            "Loading logs..."
                        )}
                    </span>
                </div>
            )}

            {/* Loading, Error, Empty, or Table State */}
            {loading ? (
                <div className="audit-state-box" role="status">
                    <div className="audit-state-icon">
                        <Clock size={28} className="animate-spin" aria-hidden="true" />
                    </div>
                    <h2 className="audit-state-title">Loading audit logs...</h2>
                    <p className="audit-state-text">Fetching the audit events from the server.</p>
                </div>
            ) : error ? (
                <div className="audit-state-box audit-error-box" role="alert">
                    <div className="audit-state-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                        <ShieldAlert size={28} aria-hidden="true" />
                    </div>
                    <h2 className="audit-state-title">Unable to load audit logs</h2>
                    <p className="audit-state-text" style={{ marginBottom: "16px", fontWeight: 500 }}>
                        {error}
                    </p>
                    <button
                        type="button"
                        className="audit-btn"
                        onClick={() => {
                            beginRequestState()
                            setRefreshTrigger((t) => t + 1)
                        }}
                    >
                        <RefreshCw size={15} aria-hidden="true" />
                        <span>Retry</span>
                    </button>
                </div>
            ) : !data || data.items.length === 0 ? (
                <div className="audit-state-box">
                    <div className="audit-state-icon">
                        <History size={28} aria-hidden="true" />
                    </div>
                    <h2 className="audit-state-title">No audit logs found</h2>
                    <p className="audit-state-text">
                        Try adjusting your filters or date range to find the audit entries you are looking for.
                    </p>
                </div>
            ) : (
                <div className="audit-table-wrapper">
                    {/* Desktop Table View */}
                    <table className="audit-table" aria-label="Audit log entries">
                        <thead>
                            <tr>
                                <th scope="col">Timestamp</th>
                                <th scope="col">Category</th>
                                <th scope="col">Action</th>
                                <th scope="col">Actor</th>
                                <th scope="col">Entity</th>
                                <th scope="col" style={{ textAlign: "right" }}>
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((log) => (
                                <tr key={log.id}>
                                    <td className="audit-time-cell">{formatTimestamp(log.timestampUtc)}</td>
                                    <td>{getCategoryBadge(log.category)}</td>
                                    <td className="audit-action-cell">{getActionBadge(log.action)}</td>
                                    <td className="audit-actor-cell">
                                        <div className="audit-actor-content">
                                            <span className="audit-actor-identity">
                                                {log.actorEmail?.trim() || "—"}
                                            </span>
                                            {renderActorBadge(log)}
                                        </div>
                                    </td>
                                    <td className="audit-entity-cell">
                                        {log.entityName ? (
                                            <span>
                                                {log.entityName}
                                                {log.entityId ? ` #${log.entityId}` : ""}
                                            </span>
                                        ) : (
                                            <span style={{ color: "#9ca3af" }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <button
                                            type="button"
                                            className="audit-btn"
                                            style={{ padding: "4px 8px", fontSize: "12px" }}
                                            onClick={(e) => {
                                                setDetailTriggerElement(e.currentTarget)
                                                setSelectedLog(log)
                                            }}
                                            aria-label={`View details for action ${log.action} at ${log.timestampUtc}`}
                                        >
                                            <Eye size={14} aria-hidden="true" />
                                            <span>View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="audit-cards-list">
                        {data.items.map((log) => (
                            <div key={log.id} className="audit-card">
                                <div className="audit-card-top">
                                    {getCategoryBadge(log.category)}
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                        {formatTimestamp(log.timestampUtc)}
                                    </span>
                                </div>
                                <div className="audit-card-row">
                                    <span className="audit-card-label">Action</span>
                                    <span className="audit-card-val">{getActionBadge(log.action)}</span>
                                </div>
                                <div className="audit-card-row">
                                    <span className="audit-card-label">Actor</span>
                                    <span className="audit-card-val audit-card-actor">
                                        <span>{log.actorEmail?.trim() || "—"}</span>
                                        {renderActorBadge(log)}
                                    </span>
                                </div>
                                <div className="audit-card-row">
                                    <span className="audit-card-label">Entity</span>
                                    <span className="audit-card-val">
                                        {log.entityName
                                            ? `${log.entityName}${log.entityId ? ` #${log.entityId}` : ""}`
                                            : "—"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                                    <button
                                        type="button"
                                        className="audit-btn"
                                        style={{ padding: "4px 10px", fontSize: "12px" }}
                                        onClick={(e) => {
                                            setDetailTriggerElement(e.currentTarget)
                                            setSelectedLog(log)
                                        }}
                                    >
                                        <Eye size={14} aria-hidden="true" />
                                        <span>View Details</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Bar */}
                    <div className="audit-pagination">
                        <div className="audit-pagination-size">
                            <label htmlFor="audit-page-size-select">Rows per page:</label>
                            <select
                                id="audit-page-size-select"
                                className="audit-filter-select"
                                style={{ height: "32px", padding: "2px 8px" }}
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <div className="audit-pagination-nav">
                            <button
                                type="button"
                                className="audit-btn"
                                onClick={() => {
                                    beginRequestState()
                                    setPage((p) => Math.max(1, p - 1))
                                }}
                                disabled={!hasPreviousPage || loading}
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                                <span>Prev</span>
                            </button>

                            <span className="audit-page-indicator">
                                Page <strong>{data.page}</strong> of <strong>{data.totalPages || 1}</strong>
                            </span>

                            <button
                                type="button"
                                className="audit-btn"
                                onClick={() => {
                                    beginRequestState()
                                    setPage((p) => p + 1)
                                }}
                                disabled={!hasNextPage || loading}
                                aria-label="Next page"
                            >
                                <span>Next</span>
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            <AuditLogDetailsModal
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
                triggerElement={detailTriggerElement}
            />
        </section>
    )
}

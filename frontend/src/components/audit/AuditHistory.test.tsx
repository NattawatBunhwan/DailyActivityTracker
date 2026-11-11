import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AuditHistory from "./AuditHistory"
import * as auditApi from "../../api/auditApi"
import { AuditCategory } from "../../types/audit"
import type { PagedAuditLogsResponse } from "../../types/audit"

// Helper to create valid mock JWT
function createMockJwt(role: string): string {
    const header = btoa(JSON.stringify({ alg: "HS256" }))
    const payload = btoa(JSON.stringify({ role, sub: "123", email: `${role.toLowerCase()}@test.com` }))
    return `${header}.${payload}.sig`
}

// Deferred promise helper to simulate deterministic async timing / out-of-order responses
function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const mockUseAuth = vi.fn()
vi.mock("../../hooks/useAuth", () => ({
    default: () => mockUseAuth(),
}))

describe("AuditHistory Component", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(auditApi, "getAdminAuditFilterOptions").mockResolvedValue({
            actions: [
                "ActivityCreated",
                "ActivityDeleted",
                "ActivityUpdated",
                "LoginFailed",
                "LoginSucceeded",
                "LogoutSucceeded",
                "TokenRefreshFailed",
                "TokenRefreshSucceeded",
            ],
            users: [
                {
                    userId: "user-111",
                    email: "admin@test.com",
                    displayName: "Admin One",
                    role: "Admin",
                    isDeleted: false,
                },
                {
                    userId: "user-deleted-999",
                    email: "former@test.com",
                    displayName: null,
                    role: "User",
                    isDeleted: true,
                },
            ],
        })
    })

    it("renders access denied for non-admin users", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("User"),
            logout: vi.fn(),
        })

        render(<AuditHistory />)

        expect(screen.getByRole("alert")).toBeTruthy()
        expect(screen.getByText("Access Denied")).toBeTruthy()
        expect(screen.getByText(/Administrator access is required/i)).toBeTruthy()
    })

    it("fetches and displays audit logs, badges, and does not show a header Refresh button", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const mockData: PagedAuditLogsResponse = {
            items: [
                {
                    id: "log-abc-123",
                    timestampUtc: "2026-11-03T08:30:00Z",
                    category: AuditCategory.Authentication,
                    action: "LoginSucceeded",
                    userId: "user-111",
                    actorEmail: "admin@test.com",
                    actorRole: "Admin",
                    entityName: null,
                    entityId: null,
                    metadata: JSON.stringify({ browser: "Chrome" }),
                },
                {
                    id: "log-def-456",
                    timestampUtc: "2026-11-03T09:00:00Z",
                    category: AuditCategory.Data,
                    action: "ActivityCreated",
                    userId: "user-deleted-999",
                    actorEmail: "former@test.com",
                    actorRole: "User",
                    isDeletedUser: true,
                    entityName: "Activity",
                    entityId: "act-999",
                    oldValues: null,
                    newValues: JSON.stringify({ title: "New Task" }),
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 2,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const getAuditLogsSpy = vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValueOnce(mockData)

        render(<AuditHistory />)

        expect(screen.getByText("Loading audit logs...")).toBeTruthy()
        expect(screen.queryByRole("button", { name: /refresh/i })).toBeNull()

        await waitFor(() => {
            expect(screen.getAllByText("LoginSucceeded").length).toBeGreaterThan(0)
        })

        expect(screen.getAllByText("admin@test.com").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Admin").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Deleted User").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Activity #act-999").length).toBeGreaterThan(0)
        expect(getAuditLogsSpy).toHaveBeenCalledTimes(1)
    })

    it("opens details modal with updated labels, em-dash for empty fields, copy buttons, single close button, and focus restoration", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const writeTextMock = vi.fn().mockResolvedValue(undefined)
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        })

        const mockData: PagedAuditLogsResponse = {
            items: [
                {
                    id: "log-data-1",
                    timestampUtc: "2026-11-03T09:00:00Z",
                    category: AuditCategory.Data,
                    action: "ActivityUpdated",
                    userId: "user-222-guid",
                    actorEmail: "john@test.com",
                    actorRole: "User",
                    entityName: "Activity",
                    entityId: "act-123-guid",
                    correlationId: "req-corr-789",
                    ipAddress: null,
                    oldValues: JSON.stringify({ title: "Old Title" }),
                    newValues: JSON.stringify({ title: "Updated Title" }),
                    metadata: JSON.stringify({ source: "web" }),
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue(mockData)

        render(<AuditHistory />)

        await waitFor(() => {
            expect(screen.getAllByText("ActivityUpdated").length).toBeGreaterThan(0)
        })

        const viewButtons = screen.getAllByRole("button", { name: /view details for action/i })
        const triggerButton = viewButtons[0]
        triggerButton.focus()
        fireEvent.click(triggerButton)

        // Modal should open
        expect(screen.getByRole("dialog", { name: /audit record details/i })).toBeTruthy()

        // Verify updated field labels
        expect(screen.getByText("Local Date & Time")).toBeTruthy()
        expect(screen.getByText("UTC Date & Time")).toBeTruthy()
        expect(screen.getByText("Entity Type")).toBeTruthy()
        expect(screen.getByText("Target ID")).toBeTruthy()
        expect(screen.getByText("Request ID")).toBeTruthy()

        // Null IP Address should render as em dash "—", not "None", and not have a Copy button
        expect(screen.queryByText("None")).toBeNull()
        expect(screen.queryByRole("button", { name: /copy ip address/i })).toBeNull()

        // Copy buttons for populated fields should exist and copy raw values
        const copyUserIdBtn = screen.getByRole("button", { name: /copy user id/i })
        const copyTargetIdBtn = screen.getByRole("button", { name: /copy target id/i })
        const copyRequestIdBtn = screen.getByRole("button", { name: /copy request id/i })

        fireEvent.click(copyUserIdBtn)
        expect(writeTextMock).toHaveBeenCalledWith("user-222-guid")

        fireEvent.click(copyTargetIdBtn)
        expect(writeTextMock).toHaveBeenCalledWith("act-123-guid")

        fireEvent.click(copyRequestIdBtn)
        expect(writeTextMock).toHaveBeenCalledWith("req-corr-789")

        // Verify JSON sections
        expect(screen.getByText("Old Values")).toBeTruthy()
        expect(screen.getByText("New Values")).toBeTruthy()
        expect(screen.getByText(/"Old Title"/)).toBeTruthy()
        expect(screen.getByText(/"Updated Title"/)).toBeTruthy()

        // Only top-right X close button should exist inside dialog (no duplicate bottom "Close" text button)
        const closeButtons = screen.getAllByRole("button", { name: /close/i })
        expect(closeButtons).toHaveLength(1)
        expect(closeButtons[0].getAttribute("aria-label")).toBe("Close audit log details")

        // Close modal and verify focus returns to trigger button
        fireEvent.click(closeButtons[0])

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull()
        })
        expect(document.activeElement).toBe(triggerButton)
    })

    it("filters by Category, Action, User, and Date Pickers, and resets all filters via Reset Filters", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const mockData: PagedAuditLogsResponse = {
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const getAuditLogsSpy = vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue(mockData)

        render(<AuditHistory />)

        await waitFor(() => {
            expect(screen.getByText("No audit logs found")).toBeTruthy()
        })

        // Category filter: default is placeholder "Select category" and no "All Categories" option
        const categoryTrigger = screen.getByRole("button", { name: /category/i })
        expect(categoryTrigger.textContent).toContain("Select category")
        fireEvent.click(categoryTrigger)
        expect(screen.queryByRole("option", { name: /all categories/i })).toBeNull()

        const authOption = screen.getByRole("option", { name: "Authentication" })
        fireEvent.click(authOption)
        expect(categoryTrigger.textContent).toContain("Authentication")

        // Selecting the already-selected category option clears it
        fireEvent.click(categoryTrigger)
        fireEvent.click(screen.getByRole("option", { name: /Authentication, selected/i }))
        expect(categoryTrigger.textContent).toContain("Select category")

        // Action filter: searchable dropdown
        const actionTrigger = screen.getByRole("button", { name: /action/i })
        fireEvent.click(actionTrigger)
        const actionSearch = screen.getByRole("searchbox", { name: /search action options/i })
        fireEvent.change(actionSearch, { target: { value: "LoginFailed" } })
        fireEvent.click(screen.getByRole("option", { name: "LoginFailed" }))
        expect(actionTrigger.textContent).toContain("LoginFailed")

        // User filter: searchable dropdown displaying user info and passing userId
        const userTrigger = screen.getByRole("button", { name: /user/i })
        fireEvent.click(userTrigger)
        const userOption = await screen.findByRole("option", { name: /admin@test\.com/i })
        fireEvent.click(userOption)
        expect(userTrigger.textContent).toContain("admin@test.com")

        // Test Date Picker: opening unselected date picker highlights today without auto-selecting
        const fromDateTrigger = screen.getByRole("button", { name: /from date/i })
        expect(fromDateTrigger.textContent).toContain("Select from date")
        fireEvent.click(fromDateTrigger)
        const todayCell = screen.getByRole("gridcell", { current: "date" })
        expect(todayCell).toBeTruthy()
        expect(todayCell.className).toContain("is-today")
        expect(todayCell.className).not.toContain("is-selected")
        // Closing/clicking outside doesn't filter
        fireEvent.click(fromDateTrigger)

        // Click Reset Filters
        const resetBtn = screen.getByRole("button", { name: /reset filters/i })
        fireEvent.click(resetBtn)

        expect(categoryTrigger.textContent).toContain("Select category")
        expect(actionTrigger.textContent).toContain("Select action")
        expect(userTrigger.textContent).toContain("Select user")
        expect(getAuditLogsSpy).toHaveBeenCalled()
    })

    it("updates available actions and clears invalid selections when changing category", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const mockData: PagedAuditLogsResponse = {
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue(mockData)

        render(<AuditHistory />)

        await waitFor(() => {
            expect(screen.getByText("No audit logs found")).toBeTruthy()
        })

        const categoryTrigger = screen.getByRole("button", { name: /category/i })
        const actionTrigger = screen.getByRole("button", { name: /action/i })

        // Select Category = Data
        fireEvent.click(categoryTrigger)
        fireEvent.click(screen.getByRole("option", { name: "Data" }))
        expect(categoryTrigger.textContent).toContain("Data")

        // Action options must only contain Data actions, not Auth actions
        fireEvent.click(actionTrigger)
        expect(screen.getByRole("option", { name: "ActivityCreated" })).toBeTruthy()
        expect(screen.queryByRole("option", { name: "LoginSucceeded" })).toBeNull()

        // Select ActivityCreated
        fireEvent.click(screen.getByRole("option", { name: "ActivityCreated" }))
        expect(actionTrigger.textContent).toContain("ActivityCreated")

        // While ActivityCreated is selected, Category only shows Data
        fireEvent.click(categoryTrigger)
        expect(screen.getByRole("option", { name: /Data/i })).toBeTruthy()
        expect(screen.queryByRole("option", { name: "Authentication" })).toBeNull()
        // Close category dropdown
        fireEvent.click(categoryTrigger)

        // Clear Action filter to select another category
        fireEvent.click(actionTrigger)
        fireEvent.click(screen.getByRole("option", { name: /ActivityCreated, selected/i }))
        expect(actionTrigger.textContent).toContain("Select action")

        // Now switch Category to Authentication
        fireEvent.click(categoryTrigger)
        fireEvent.click(screen.getByRole("option", { name: "Authentication" }))

        // Now Action options must contain Auth actions, not Data actions
        fireEvent.click(actionTrigger)
        expect(screen.getByRole("option", { name: "LoginSucceeded" })).toBeTruthy()
        expect(screen.queryByRole("option", { name: "ActivityCreated" })).toBeNull()
    })

    it("prevents an older overlapping response from overwriting a newer response", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const req1 = createDeferred<PagedAuditLogsResponse>()
        const req2 = createDeferred<PagedAuditLogsResponse>()

        const getAuditLogsSpy = vi
            .spyOn(auditApi, "getAdminAuditLogs")
            .mockImplementationOnce(() => req1.promise)
            .mockImplementationOnce(() => req2.promise)

        render(<AuditHistory />)

        // Wait for filter metadata to resolve
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /action/i })).toBeTruthy()
        })

        // Request 1 is pending
        expect(screen.getByText("Loading audit logs...")).toBeTruthy()
        expect(getAuditLogsSpy).toHaveBeenCalledTimes(1)

        // Trigger request 2 by selecting an action filter
        const actionTrigger = screen.getByRole("button", { name: /action/i })
        fireEvent.click(actionTrigger)
        const activityCreatedOption = await screen.findByRole("option", { name: "ActivityCreated" })
        fireEvent.click(activityCreatedOption)

        expect(getAuditLogsSpy).toHaveBeenCalledTimes(2)

        // Resolve request 2 (newer) FIRST
        req2.resolve({
            items: [
                {
                    id: "log-req-2",
                    timestampUtc: "2026-11-03T11:00:00Z",
                    category: AuditCategory.Data,
                    action: "ActivityCreated",
                    userId: "user-2",
                    actorEmail: "new@example.com",
                    actorRole: "Admin",
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        // Verify request 2 rendered
        await waitFor(() => {
            expect(screen.getAllByText("new@example.com").length).toBeGreaterThan(0)
        })

        // Now resolve request 1 (older) OUT OF ORDER
        req1.resolve({
            items: [
                {
                    id: "log-req-1",
                    timestampUtc: "2026-11-03T08:00:00Z",
                    category: AuditCategory.Authentication,
                    action: "LoginSucceeded",
                    userId: "user-1",
                    actorEmail: "stale-old@example.com",
                    actorRole: "Admin",
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        // Allow microtasks to process
        await new Promise((r) => setTimeout(r, 20))

        // Request 2 content must still be present; Request 1 must NOT overwrite it
        expect(screen.getAllByText("new@example.com").length).toBeGreaterThan(0)
        expect(screen.queryByText("stale-old@example.com")).toBeNull()
    })

    it("prevents an older request error from overwriting the latest response or clearing loading state", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const req1 = createDeferred<PagedAuditLogsResponse>()
        const req2 = createDeferred<PagedAuditLogsResponse>()

        vi.spyOn(auditApi, "getAdminAuditLogs")
            .mockImplementationOnce(() => req1.promise)
            .mockImplementationOnce(() => req2.promise)

        render(<AuditHistory />)

        // Trigger request 2
        const actionTrigger = screen.getByRole("button", { name: /action/i })
        fireEvent.click(actionTrigger)
        const loginSucceededOption = await screen.findByRole("option", { name: "LoginSucceeded" })
        fireEvent.click(loginSucceededOption)

        // Request 1 fails with an error
        req1.reject(new Error("Old request failed"))

        // Allow microtasks to execute
        await new Promise((r) => setTimeout(r, 20))

        // Old error should NOT be displayed while Request 2 is still pending
        expect(screen.queryByText("Old request failed")).toBeNull()
        expect(screen.getByText("Loading audit logs...")).toBeTruthy()

        // Resolve request 2 successfully
        req2.resolve({
            items: [
                {
                    id: "log-req-2",
                    timestampUtc: "2026-11-03T12:00:00Z",
                    category: AuditCategory.Authentication,
                    action: "LoginSucceeded",
                    userId: "user-latest",
                    actorEmail: "latest@example.com",
                    actorRole: "Admin",
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        await waitFor(() => {
            expect(screen.getAllByText("latest@example.com").length).toBeGreaterThan(0)
        })

        expect(screen.queryByText("Old request failed")).toBeNull()
    })

    it("does not update state when component is unmounted while request is pending", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const req = createDeferred<PagedAuditLogsResponse>()
        vi.spyOn(auditApi, "getAdminAuditLogs").mockImplementationOnce(() => req.promise)

        const { unmount } = render(<AuditHistory />)

        unmount()

        // Resolving after unmount should not throw React state update warnings
        req.resolve({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        await new Promise((r) => setTimeout(r, 20))
    })

    it("displays error state without stale data and retries when Retry button is clicked", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const mockSuccess: PagedAuditLogsResponse = {
            items: [
                {
                    id: "log-ok-1",
                    timestampUtc: "2026-11-03T12:00:00Z",
                    category: AuditCategory.Authentication,
                    action: "LoginSucceeded",
                    userId: "user-1",
                    actorEmail: "recovered@example.com",
                    actorRole: "Admin",
                },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const getAuditLogsSpy = vi
            .spyOn(auditApi, "getAdminAuditLogs")
            .mockRejectedValueOnce(new Error("Failed to load audit logs."))
            .mockResolvedValueOnce(mockSuccess)

        render(<AuditHistory />)

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeTruthy()
        })

        expect(screen.getByText("Failed to load audit logs.")).toBeTruthy()

        const retryBtn = screen.getByRole("button", { name: /retry/i })
        fireEvent.click(retryBtn)

        await waitFor(() => {
            expect(screen.getAllByText("recovered@example.com").length).toBeGreaterThan(0)
        })

        expect(getAuditLogsSpy).toHaveBeenCalledTimes(2)
        expect(screen.queryByRole("button", { name: /retry/i })).toBeNull()
    })

    it("excludes LoginFailed from Authentication actions when only LoginSucceeded exists, and includes it when present", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        // 1. Backend filter options returns only LoginSucceeded (no LoginFailed)
        const getFilterOptionsSpy = vi.spyOn(auditApi, "getAdminAuditFilterOptions").mockResolvedValue({
            actions: ["LoginSucceeded"],
            users: [
                {
                    userId: "user-1",
                    email: "admin@test.com",
                    displayName: "Admin One",
                    role: "Admin",
                    isDeleted: false,
                },
            ],
        })

        vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        const { unmount } = render(<AuditHistory />)

        const categoryTrigger = screen.getByRole("button", { name: /category/i })
        const actionTrigger = screen.getByRole("button", { name: /action/i })

        // Select Authentication category
        fireEvent.click(categoryTrigger)
        fireEvent.click(screen.getByRole("option", { name: "Authentication" }))

        // Action options must contain LoginSucceeded and exclude LoginFailed
        fireEvent.click(actionTrigger)
        const loginSucceededOpt = await screen.findByRole("option", { name: "LoginSucceeded" })
        expect(loginSucceededOpt).toBeTruthy()
        expect(screen.queryByRole("option", { name: "LoginFailed" })).toBeNull()

        unmount()

        // 2. Now test when LoginFailed is actually recorded in audit logs
        getFilterOptionsSpy.mockResolvedValue({
            actions: ["LoginFailed", "LoginSucceeded"],
            users: [
                {
                    userId: "user-1",
                    email: "admin@test.com",
                    displayName: "Admin One",
                    role: "Admin",
                    isDeleted: false,
                },
            ],
        })

        render(<AuditHistory />)

        const categoryTrigger2 = screen.getByRole("button", { name: /category/i })
        const actionTrigger2 = screen.getByRole("button", { name: /action/i })

        fireEvent.click(categoryTrigger2)
        fireEvent.click(screen.getByRole("option", { name: "Authentication" }))

        fireEvent.click(actionTrigger2)
        const loginSucceededOpt2 = await screen.findByRole("option", { name: "LoginSucceeded" })
        const loginFailedOpt2 = await screen.findByRole("option", { name: "LoginFailed" })
        expect(loginSucceededOpt2).toBeTruthy()
        expect(loginFailedOpt2).toBeTruthy()
    })

    it("automatically syncs Category and filters Category options when Action is selected before Category", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        const getAuditLogsSpy = vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        render(<AuditHistory />)

        await waitFor(() => {
            expect(screen.getByText("No audit logs found")).toBeTruthy()
        })

        const categoryTrigger = screen.getByRole("button", { name: /category/i })
        const actionTrigger = screen.getByRole("button", { name: /action/i })
        const userTrigger = screen.getByRole("button", { name: /user/i })

        // Initially Category is unselected
        expect(categoryTrigger.textContent).toContain("Select category")

        // Select Action = ActivityCreated FIRST (before selecting Category)
        fireEvent.click(actionTrigger)
        fireEvent.click(await screen.findByRole("option", { name: "ActivityCreated" }))

        // Category should automatically sync to Data
        expect(categoryTrigger.textContent).toContain("Data")

        // User options should remain available
        fireEvent.click(userTrigger)
        expect(await screen.findByRole("option", { name: /admin@test\.com/i })).toBeTruthy()
        fireEvent.click(userTrigger)

        // Verify getAdminAuditLogs was called with both category: Data (2) and action: "ActivityCreated"
        await waitFor(() => {
            expect(getAuditLogsSpy).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    category: AuditCategory.Data,
                    action: "ActivityCreated",
                })
            )
        })
    })

    it("allows searching user dropdown by Name, Email, exact User ID, and partial User ID without showing User ID in label", async () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        vi.spyOn(auditApi, "getAdminAuditFilterOptions").mockResolvedValue({
            actions: ["LoginSucceeded"],
            users: [
                {
                    userId: "550e8400-e29b-41d4-a716-446655440000",
                    email: "alice@example.com",
                    displayName: "Alice Wonder",
                    role: "Admin",
                    isDeleted: false,
                },
                {
                    userId: "770a1234-bbbb-4444-cccc-999988887777",
                    email: "bob@builder.com",
                    displayName: "Bob Builder",
                    role: "User",
                    isDeleted: false,
                },
            ],
        })

        const getAuditLogsSpy = vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        render(<AuditHistory />)

        const userTrigger = screen.getByRole("button", { name: /user/i })

        // 1. Open User dropdown and verify labels do NOT contain the raw User ID
        fireEvent.click(userTrigger)
        const aliceOpt = await screen.findByRole("option", { name: /alice@example\.com \(Alice Wonder\)/i })
        expect(aliceOpt).toBeTruthy()
        expect(aliceOpt.textContent).not.toContain("550e8400-e29b-41d4-a716-446655440000")

        const userSearchInput = screen.getByRole("searchbox", { name: /search user options/i })

        // 2. Search by Name (case-insensitive with whitespace trimming)
        fireEvent.change(userSearchInput, { target: { value: "   alice   " } })
        expect(screen.getByRole("option", { name: /alice@example\.com \(Alice Wonder\)/i })).toBeTruthy()
        expect(screen.queryByRole("option", { name: /bob@builder\.com/i })).toBeNull()

        // 3. Search by Email
        fireEvent.change(userSearchInput, { target: { value: "builder.com" } })
        expect(screen.getByRole("option", { name: /bob@builder\.com \(Bob Builder\)/i })).toBeTruthy()
        expect(screen.queryByRole("option", { name: /alice@example\.com/i })).toBeNull()

        // 4. Search by exact User ID
        fireEvent.change(userSearchInput, { target: { value: "550e8400-e29b-41d4-a716-446655440000" } })
        expect(screen.getByRole("option", { name: /alice@example\.com \(Alice Wonder\)/i })).toBeTruthy()
        expect(screen.queryByRole("option", { name: /bob@builder\.com/i })).toBeNull()

        // 5. Search by partial User ID
        fireEvent.change(userSearchInput, { target: { value: "99998888" } })
        expect(screen.getByRole("option", { name: /bob@builder\.com \(Bob Builder\)/i })).toBeTruthy()
        expect(screen.queryByRole("option", { name: /alice@example\.com/i })).toBeNull()

        // 6. Selecting user sets the filter to the user's actual userId and sends userId to getAdminAuditLogs
        fireEvent.click(screen.getByRole("option", { name: /bob@builder\.com \(Bob Builder\)/i }))
        expect(userTrigger.textContent).toContain("bob@builder.com (Bob Builder)")

        await waitFor(() => {
            expect(getAuditLogsSpy).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    userId: "770a1234-bbbb-4444-cccc-999988887777",
                })
            )
        })
    })
})

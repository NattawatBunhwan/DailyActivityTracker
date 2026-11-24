import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import App from "./App"
import * as auditApi from "./api/auditApi"

function createMockJwt(role: string): string {
    const header = btoa(JSON.stringify({ alg: "HS256" }))
    const payload = btoa(JSON.stringify({ role, sub: "123", email: `${role.toLowerCase()}@test.com` }))
    return `${header}.${payload}.sig`
}

const mockUseAuth = vi.fn()
vi.mock("./hooks/useAuth", () => ({
    default: () => mockUseAuth(),
}))

describe("Admin Route Authorization in App", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        window.history.replaceState({}, "", "/admin/audit-logs")
    })

    it("renders Login screen when an unauthenticated user accesses /admin/audit-logs", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            isInitializing: false,
            token: "",
            logout: vi.fn(),
        })

        render(<App />)

        expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy()
        expect(screen.getByRole("button", { name: /^login$/i })).toBeTruthy()
        expect(screen.queryByText("Access Denied")).toBeNull()
        expect(screen.queryByText("Audit Logs")).toBeNull()
    })

    it("renders session restoring spinner when session bootstrap is initializing", () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            isInitializing: true,
            token: "",
            logout: vi.fn(),
        })

        render(<App />)

        expect(screen.getByText("Restoring session...")).toBeTruthy()
        expect(screen.queryByText("Welcome back")).toBeNull()
        expect(screen.queryByText("Access Denied")).toBeNull()
    })

    it("renders Access Denied without redirecting to login when a normal authenticated User accesses /admin/audit-logs", () => {
        const getAuditLogsSpy = vi.spyOn(auditApi, "getAdminAuditLogs")
        const getFilterOptionsSpy = vi.spyOn(auditApi, "getAdminAuditFilterOptions")

        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitializing: false,
            token: createMockJwt("User"),
            logout: vi.fn(),
        })

        render(<App />)

        expect(screen.getByRole("alert")).toBeTruthy()
        expect(screen.getByRole("heading", { name: "Access Denied" })).toBeTruthy()
        expect(
            screen.getByText("You do not have permission to view the audit history. Administrator access is required.")
        ).toBeTruthy()

        const backButton = screen.getByRole("button", { name: "Back to Activities" })
        expect(backButton).toBeTruthy()

        // Verify normal user does NOT trigger audit API endpoints
        expect(getAuditLogsSpy).not.toHaveBeenCalled()
        expect(getFilterOptionsSpy).not.toHaveBeenCalled()

        // Verify clicking Back to Activities updates the path
        fireEvent.click(backButton)
        expect(window.location.pathname).toBe("/activities")
    })

    it("renders Audit History when an authenticated Admin accesses /admin/audit-logs", async () => {
        vi.spyOn(auditApi, "getAdminAuditFilterOptions").mockResolvedValue({
            actions: [],
            users: [],
        })
        vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitializing: false,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        render(<App />)

        expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeTruthy()
        expect(screen.queryByText("Access Denied")).toBeNull()
        expect(screen.queryByText("Welcome back")).toBeNull()
    })

    it("renders Audit History when an authenticated Admin accesses /admin/audit-logs/ with trailing slash", () => {
        window.history.replaceState({}, "", "/admin/audit-logs/")
        vi.spyOn(auditApi, "getAdminAuditFilterOptions").mockResolvedValue({
            actions: [],
            users: [],
        })
        vi.spyOn(auditApi, "getAdminAuditLogs").mockResolvedValue({
            items: [],
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        })

        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            isInitializing: false,
            token: createMockJwt("Admin"),
            logout: vi.fn(),
        })

        render(<App />)

        expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeTruthy()
        expect(screen.queryByText("Access Denied")).toBeNull()
    })
})

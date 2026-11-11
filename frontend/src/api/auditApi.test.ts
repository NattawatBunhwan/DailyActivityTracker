import { describe, it, expect, vi, beforeEach } from "vitest"
import { getAdminAuditFilterOptions, getAdminAuditLogs } from "./auditApi"
import * as httpClient from "./httpClient"
import { AuditCategory } from "../types/audit"

describe("auditApi", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("builds query parameters accurately and invokes authenticatedFetch", async () => {
        const mockResponse = {
            items: [
                {
                    id: "log-1",
                    timestampUtc: "2026-11-03T10:00:00Z",
                    category: AuditCategory.Authentication,
                    action: "LoginSucceeded",
                    userId: "user-123",
                    actorEmail: "admin@example.com",
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

        const fetchSpy = vi.spyOn(httpClient, "authenticatedFetch").mockResolvedValueOnce(
            new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        )

        const result = await getAdminAuditLogs("mock-token", {
            page: 2,
            pageSize: 10,
            category: AuditCategory.Authentication,
            action: "LoginSucceeded",
            userId: "user-123",
            from: "2026-11-01",
            to: "2026-11-03",
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const calledUrl = fetchSpy.mock.calls[0][0] as string
        expect(calledUrl).toContain("/api/admin/audit-logs?")
        expect(calledUrl).toContain("page=2")
        expect(calledUrl).toContain("pageSize=10")
        expect(calledUrl).toContain("category=1")
        expect(calledUrl).toContain("action=LoginSucceeded")
        expect(calledUrl).toContain("userId=user-123")
        expect(calledUrl).toContain("from=2026-11-01")
        expect(calledUrl).toContain("to=2026-11-03")

        expect(result).toEqual(mockResponse)
    })

    it("throws appropriate error when fetch fails", async () => {
        vi.spyOn(httpClient, "authenticatedFetch").mockRejectedValueOnce(new Error("Network error"))

        await expect(getAdminAuditLogs("token", {})).rejects.toThrow("Failed to load audit logs.")
    })

    it("handles 403 Forbidden with proper error message", async () => {
        vi.spyOn(httpClient, "authenticatedFetch").mockResolvedValueOnce(
            new Response("Forbidden", { status: 403, statusText: "Forbidden" })
        )

        await expect(getAdminAuditLogs("token", {})).rejects.toThrow()
    })

    it("fetches filter options via getAdminAuditFilterOptions", async () => {
        const mockOptions = {
            actions: ["ActivityCreated", "LoginSucceeded"],
            users: [
                {
                    userId: "user-123",
                    email: "admin@example.com",
                    displayName: "Admin User",
                    role: "Admin",
                    isDeleted: false,
                },
            ],
        }

        const fetchSpy = vi.spyOn(httpClient, "authenticatedFetch").mockResolvedValueOnce(
            new Response(JSON.stringify(mockOptions), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        )

        const result = await getAdminAuditFilterOptions("mock-token", {
            category: AuditCategory.Authentication,
            action: "LoginSucceeded",
        })
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(fetchSpy.mock.calls[0][0]).toContain("/api/admin/audit-logs/filters?category=1&action=LoginSucceeded")
        expect(result).toEqual(mockOptions)
    })
})

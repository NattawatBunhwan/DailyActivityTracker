import type { AuditCategory, AuditFilterOptionsResponse, AuditLogQuery, PagedAuditLogsResponse } from "../types/audit"
import { handleApiError } from "./apiError"
import { API_BASE_URL } from "./config"
import { authenticatedFetch } from "./httpClient"

export async function getAdminAuditLogs(
    token: string,
    query: AuditLogQuery = {}
): Promise<PagedAuditLogsResponse> {
    const params = new URLSearchParams()

    params.set("page", String(query.page ?? 1))
    params.set("pageSize", String(query.pageSize ?? 20))

    if (query.category !== undefined && query.category !== null) {
        params.set("category", String(query.category))
    }

    if (query.action && query.action.trim()) {
        params.set("action", query.action.trim())
    }

    if (query.userId && query.userId.trim()) {
        params.set("userId", query.userId.trim())
    }

    if (query.from && query.from.trim()) {
        params.set("from", query.from.trim())
    }

    if (query.to && query.to.trim()) {
        params.set("to", query.to.trim())
    }

    const queryString = params.toString()
    const url = `${API_BASE_URL}/api/admin/audit-logs${queryString ? `?${queryString}` : ""}`

    let response: Response
    try {
        response = await authenticatedFetch(
            url,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            token
        )
    } catch {
        throw new Error("Failed to load audit logs.")
    }

    await handleApiError(response, "Failed to load audit logs.")

    const data: PagedAuditLogsResponse = await response.json()
    return data
}

export async function getAdminAuditFilterOptions(
    token: string,
    query: { category?: AuditCategory; action?: string } = {}
): Promise<AuditFilterOptionsResponse> {
    const params = new URLSearchParams()
    if (query.category !== undefined && query.category !== null) {
        params.set("category", String(query.category))
    }
    if (query.action && query.action.trim()) {
        params.set("action", query.action.trim())
    }
    const queryString = params.toString()
    const url = `${API_BASE_URL}/api/admin/audit-logs/filters${queryString ? `?${queryString}` : ""}`

    let response: Response
    try {
        response = await authenticatedFetch(
            url,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            token
        )
    } catch {
        throw new Error("Failed to load audit filter options.")
    }

    await handleApiError(response, "Failed to load audit filter options.")

    const data: AuditFilterOptionsResponse = await response.json()
    return data
}

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    authenticatedFetch,
    setAuthSessionCallbacks,
    setLatestAccessToken,
} from "./httpClient"
import * as authApi from "./authApi"

describe("httpClient authenticatedFetch", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        setAuthSessionCallbacks(null)
        setLatestAccessToken(null)
    })

    it("sends request with initial token and passes 200 response through", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        vi.stubGlobal("fetch", fetchMock)

        const response = await authenticatedFetch("https://example.com/api/test", {}, "test-token")

        expect(response.status).toBe(200)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const sentHeaders = fetchMock.mock.calls[0][1].headers as Headers
        expect(sentHeaders.get("Authorization")).toBe("Bearer test-token")
    })

    it("replaces existing stale Authorization header with latestAccessToken", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        vi.stubGlobal("fetch", fetchMock)

        setLatestAccessToken("fresh-in-memory-token")

        const response = await authenticatedFetch(
            "https://example.com/api/test",
            {
                headers: {
                    Authorization: "Bearer stale-token",
                },
            },
            "stale-token"
        )

        expect(response.status).toBe(200)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const sentHeaders = fetchMock.mock.calls[0][1].headers as Headers
        expect(sentHeaders.get("Authorization")).toBe("Bearer fresh-in-memory-token")
    })

    it("refreshes access token and retries request on 401 response", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: "success" }), { status: 200 }))
        vi.stubGlobal("fetch", fetchMock)

        const onSessionRefreshed = vi.fn()
        const onSessionExpired = vi.fn()
        const getRefreshToken = vi.fn().mockReturnValue("valid-refresh-token")

        setAuthSessionCallbacks({
            getRefreshToken,
            onSessionRefreshed,
            onSessionExpired,
        })

        vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "new-access-token",
            expiresAt: "2026-10-31T23:30:00Z",
            refreshToken: "new-refresh-token",
        })

        const response = await authenticatedFetch(
            "https://example.com/api/activities",
            { method: "GET" },
            "expired-token"
        )

        expect(response.status).toBe(200)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(authApi.refreshAccessToken).toHaveBeenCalledWith("valid-refresh-token")
        expect(onSessionRefreshed).toHaveBeenCalledWith({
            token: "new-access-token",
            expiresAt: "2026-10-31T23:30:00Z",
            refreshToken: "new-refresh-token",
        })
        expect(onSessionExpired).not.toHaveBeenCalled()

        // Verify retried request used the new access token
        const retryHeaders = fetchMock.mock.calls[1][1].headers as Headers
        expect(retryHeaders.get("Authorization")).toBe("Bearer new-access-token")
    })

    it("does not retry again if retried request still returns 401, and clears session", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
            .mockResolvedValueOnce(new Response("Still Unauthorized", { status: 401 }))
        vi.stubGlobal("fetch", fetchMock)

        const onSessionExpired = vi.fn()
        setAuthSessionCallbacks({
            getRefreshToken: () => "refresh-token",
            onSessionRefreshed: vi.fn(),
            onSessionExpired,
        })

        vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "refreshed-token",
            expiresAt: "2026-10-31T23:30:00Z",
            refreshToken: "new-refresh-token",
        })

        const response = await authenticatedFetch("https://example.com/api/test", {}, "expired-token")

        expect(response.status).toBe(401)
        expect(fetchMock).toHaveBeenCalledTimes(2) // Original + exactly 1 retry
        expect(onSessionExpired).toHaveBeenCalledTimes(1)
    })

    it("shares a single refresh operation across multiple concurrent 401 responses", async () => {
        let callCount = 0
        const fetchMock = vi.fn().mockImplementation(() => {
            callCount++
            // First 2 calls return 401, next retries return 200
            if (callCount <= 2) {
                return Promise.resolve(new Response("Unauthorized", { status: 401 }))
            }
            return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        })
        vi.stubGlobal("fetch", fetchMock)

        const refreshSpy = vi.spyOn(authApi, "refreshAccessToken").mockImplementation(async () => {
            await new Promise((r) => setTimeout(r, 10))
            return {
                token: "shared-refreshed-token",
                expiresAt: "2026-10-31T23:30:00Z",
                refreshToken: "rotated-refresh-token",
            }
        })

        setAuthSessionCallbacks({
            getRefreshToken: () => "active-refresh-token",
            onSessionRefreshed: vi.fn(),
            onSessionExpired: vi.fn(),
        })

        const [res1, res2] = await Promise.all([
            authenticatedFetch("https://example.com/api/1", {}, "expired-token"),
            authenticatedFetch("https://example.com/api/2", {}, "expired-token"),
        ])

        expect(res1.status).toBe(200)
        expect(res2.status).toBe(200)
        // refreshAccessToken must be called exactly once despite 2 concurrent 401s
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(4) // 2 original + 2 retried
    })

    it("clears session and triggers logout when refreshAccessToken fails", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
        vi.stubGlobal("fetch", fetchMock)

        const onSessionExpired = vi.fn()
        setAuthSessionCallbacks({
            getRefreshToken: () => "invalid-refresh-token",
            onSessionRefreshed: vi.fn(),
            onSessionExpired,
        })

        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("Refresh token expired"))

        const response = await authenticatedFetch("https://example.com/api/test", {}, "expired-token")

        expect(response.status).toBe(401)
        expect(onSessionExpired).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(1) // No retry attempted when refresh fails
    })

    it("clears session immediately when no refresh token is available", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
        vi.stubGlobal("fetch", fetchMock)

        const onSessionExpired = vi.fn()
        setAuthSessionCallbacks({
            getRefreshToken: () => "",
            onSessionRefreshed: vi.fn(),
            onSessionExpired,
        })

        const refreshSpy = vi.spyOn(authApi, "refreshAccessToken")

        const response = await authenticatedFetch("https://example.com/api/test", {}, "expired-token")

        expect(response.status).toBe(401)
        expect(onSessionExpired).toHaveBeenCalledTimes(1)
        expect(refreshSpy).not.toHaveBeenCalled()
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("preserves non-401 responses (400, 403, 404, 500) without attempting refresh", async () => {
        const refreshSpy = vi.spyOn(authApi, "refreshAccessToken")

        for (const status of [400, 403, 404, 500]) {
            const fetchMock = vi.fn().mockResolvedValue(new Response("Error", { status }))
            vi.stubGlobal("fetch", fetchMock)

            const response = await authenticatedFetch("https://example.com/api/test", {}, "test-token")
            expect(response.status).toBe(status)
            expect(fetchMock).toHaveBeenCalledTimes(1)
            expect(refreshSpy).not.toHaveBeenCalled()
        }
    })

    it("preserves request method, headers, and body on retry without duplicating creation on server", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ id: "activity-123" }), { status: 201 }))
        vi.stubGlobal("fetch", fetchMock)

        setAuthSessionCallbacks({
            getRefreshToken: () => "refresh-token",
            onSessionRefreshed: vi.fn(),
            onSessionExpired: vi.fn(),
        })

        vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "refreshed-token",
            expiresAt: "2026-10-31T23:30:00Z",
            refreshToken: "new-refresh-token",
        })

        const payload = JSON.stringify({ title: "New Activity" })
        const response = await authenticatedFetch(
            "https://example.com/api/activities",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
            },
            "expired-token"
        )

        expect(response.status).toBe(201)
        expect(fetchMock).toHaveBeenCalledTimes(2)

        // Verify retried request preserved payload and custom headers
        const [url, init] = fetchMock.mock.calls[1]
        expect(url).toBe("https://example.com/api/activities")
        expect(init.method).toBe("POST")
        expect(init.body).toBe(payload)
        const headers = init.headers as Headers
        expect(headers.get("Content-Type")).toBe("application/json")
        expect(headers.get("Authorization")).toBe("Bearer refreshed-token")
    })
})

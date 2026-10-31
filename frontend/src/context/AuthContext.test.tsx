import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import AuthProvider from "./AuthContext"
import useAuth from "../hooks/useAuth"
import * as authApi from "../api/authApi"
import * as httpClient from "../api/httpClient"

describe("AuthContext Lifecycle", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.useFakeTimers()
        httpClient.setAuthSessionCallbacks(null)
        httpClient.setLatestAccessToken(null)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("initializes with default unauthenticated state", () => {
        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(result.current.refreshToken).toBe("")
        expect(result.current.expiresAt).toBe("")
    })

    it("updates state upon successful login and syncs latestAccessToken", () => {
        const setLatestAccessTokenSpy = vi.spyOn(httpClient, "setLatestAccessToken")

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("access-token-123")
            result.current.setRefreshToken("refresh-token-456")
            result.current.setExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString())
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.token).toBe("access-token-123")
        expect(result.current.refreshToken).toBe("refresh-token-456")
        expect(setLatestAccessTokenSpy).toHaveBeenCalledWith("access-token-123")
    })

    it("clears state and syncs null latestAccessToken on logout", async () => {
        const logoutFromServerSpy = vi.spyOn(authApi, "logoutFromServer").mockResolvedValue(undefined)
        const setLatestAccessTokenSpy = vi.spyOn(httpClient, "setLatestAccessToken")

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("token-to-clear")
            result.current.setRefreshToken("refresh-to-clear")
            result.current.setExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString())
        })

        await act(async () => {
            await result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(result.current.refreshToken).toBe("")
        expect(result.current.expiresAt).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("token-to-clear", "refresh-to-clear")
        expect(setLatestAccessTokenSpy).toHaveBeenLastCalledWith(null)
    })

    it("registers session callbacks with httpClient on mount and cleans up on unmount", () => {
        const setCallbacksSpy = vi.spyOn(httpClient, "setAuthSessionCallbacks")

        const { unmount } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        expect(setCallbacksSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                getRefreshToken: expect.any(Function),
                onSessionRefreshed: expect.any(Function),
                onSessionExpired: expect.any(Function),
            })
        )

        unmount()

        expect(setCallbacksSpy).toHaveBeenLastCalledWith(null)
    })

    it("updates state when onSessionRefreshed callback is invoked", () => {
        let sessionCallbacks: {
            getRefreshToken: () => string
            onSessionRefreshed: (data: { token: string; expiresAt: string; refreshToken: string }) => void
            onSessionExpired: () => void
        } | null = null

        vi.spyOn(httpClient, "setAuthSessionCallbacks").mockImplementation((callbacks) => {
            sessionCallbacks = callbacks
        })

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("old-token")
            result.current.setRefreshToken("old-refresh")
        })

        expect(sessionCallbacks).not.toBeNull()
        expect(sessionCallbacks!.getRefreshToken()).toBe("old-refresh")

        act(() => {
            sessionCallbacks!.onSessionRefreshed({
                token: "refreshed-token",
                expiresAt: "2026-11-01T12:00:00Z",
                refreshToken: "new-refresh-token",
            })
        })

        expect(result.current.token).toBe("refreshed-token")
        expect(result.current.expiresAt).toBe("2026-11-01T12:00:00Z")
        expect(result.current.refreshToken).toBe("new-refresh-token")
    })

    it("triggers logout when onSessionExpired callback is invoked", async () => {
        let sessionCallbacks: {
            getRefreshToken: () => string
            onSessionRefreshed: (data: { token: string; expiresAt: string; refreshToken: string }) => void
            onSessionExpired: () => void
        } | null = null

        vi.spyOn(httpClient, "setAuthSessionCallbacks").mockImplementation((callbacks) => {
            sessionCallbacks = callbacks
        })
        const logoutFromServerSpy = vi.spyOn(authApi, "logoutFromServer").mockResolvedValue(undefined)

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("active-token")
            result.current.setRefreshToken("active-refresh")
        })

        await act(async () => {
            sessionCallbacks!.onSessionExpired()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(result.current.refreshToken).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("active-token", "active-refresh")
    })

    it("schedules background refresh before expiration and updates session", async () => {
        const newExpiry = new Date(Date.now() + 120 * 1000).toISOString() // 2 minutes from now
        const refreshAccessTokenSpy = vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "bg-refreshed-token",
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            refreshToken: "bg-new-refresh-token",
        })

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("initial-token")
            result.current.setRefreshToken("initial-refresh")
            result.current.setExpiresAt(newExpiry)
        })

        // Advance timer by 60 seconds (remainingTime = 120s, refreshBuffer = 60s, delay = 60s)
        await act(async () => {
            vi.advanceTimersByTime(60 * 1000)
        })

        expect(refreshAccessTokenSpy).toHaveBeenCalledWith("initial-refresh")
        expect(result.current.token).toBe("bg-refreshed-token")
        expect(result.current.refreshToken).toBe("bg-new-refresh-token")
    })

    it("logs out immediately when scheduled background refresh fails", async () => {
        const newExpiry = new Date(Date.now() + 120 * 1000).toISOString()
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("Network / expired"))
        const logoutFromServerSpy = vi.spyOn(authApi, "logoutFromServer").mockResolvedValue(undefined)

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("initial-token")
            result.current.setRefreshToken("initial-refresh")
            result.current.setExpiresAt(newExpiry)
        })

        await act(async () => {
            vi.advanceTimersByTime(60 * 1000)
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("initial-token", "initial-refresh")
    })
})


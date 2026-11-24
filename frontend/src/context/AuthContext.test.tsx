import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { StrictMode, type ReactNode } from "react"
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

    it("initializes with default unauthenticated state when silent refresh fails", async () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInitializing).toBe(false)
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(result.current.expiresAt).toBe("")
    })

    it("restores session on mount when silent refresh succeeds with cookie", async () => {
        vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "restored-token",
            expiresAt: "2026-12-01T00:00:00Z",
        })

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        await act(async () => {
            await Promise.resolve()
        })

        expect(result.current.isInitializing).toBe(false)
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.token).toBe("restored-token")
        expect(result.current.expiresAt).toBe("2026-12-01T00:00:00Z")
    })

    it("updates state upon successful login and syncs latestAccessToken", () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))
        const setLatestAccessTokenSpy = vi.spyOn(httpClient, "setLatestAccessToken")

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("access-token-123")
            result.current.setExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString())
        })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.token).toBe("access-token-123")
        expect(setLatestAccessTokenSpy).toHaveBeenCalledWith("access-token-123")
    })

    it("clears state and syncs null latestAccessToken on logout", async () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))
        const logoutFromServerSpy = vi.spyOn(authApi, "logoutFromServer").mockResolvedValue(undefined)
        const setLatestAccessTokenSpy = vi.spyOn(httpClient, "setLatestAccessToken")

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("token-to-clear")
            result.current.setExpiresAt(new Date(Date.now() + 3600 * 1000).toISOString())
        })

        await act(async () => {
            await result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(result.current.expiresAt).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("token-to-clear")
        expect(setLatestAccessTokenSpy).toHaveBeenLastCalledWith(null)
    })

    it("registers session callbacks with httpClient on mount and cleans up on unmount", () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))
        const setCallbacksSpy = vi.spyOn(httpClient, "setAuthSessionCallbacks")

        const { unmount } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        expect(setCallbacksSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                onSessionRefreshed: expect.any(Function),
                onSessionExpired: expect.any(Function),
            })
        )

        unmount()

        expect(setCallbacksSpy).toHaveBeenLastCalledWith(null)
    })

    it("updates state when onSessionRefreshed callback is invoked", () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))
        let sessionCallbacks: {
            onSessionRefreshed: (data: { token: string; expiresAt: string }) => void
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
        })

        expect(sessionCallbacks).not.toBeNull()

        act(() => {
            sessionCallbacks!.onSessionRefreshed({
                token: "refreshed-token",
                expiresAt: "2026-11-01T12:00:00Z",
            })
        })

        expect(result.current.token).toBe("refreshed-token")
        expect(result.current.expiresAt).toBe("2026-11-01T12:00:00Z")
    })

    it("triggers logout when onSessionExpired callback is invoked", async () => {
        vi.spyOn(authApi, "refreshAccessToken").mockRejectedValue(new Error("No cookie"))
        let sessionCallbacks: {
            onSessionRefreshed: (data: { token: string; expiresAt: string }) => void
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
        })

        await act(async () => {
            sessionCallbacks!.onSessionExpired()
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("active-token")
    })

    it("schedules background refresh before expiration and updates session", async () => {
        const newExpiry = new Date(Date.now() + 120 * 1000).toISOString() // 2 minutes from now
        const refreshAccessTokenSpy = vi.spyOn(authApi, "refreshAccessToken").mockResolvedValue({
            token: "bg-refreshed-token",
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        })

        const { result } = renderHook(() => useAuth(), {
            wrapper: AuthProvider,
        })

        act(() => {
            result.current.setIsAuthenticated(true)
            result.current.setToken("initial-token")
            result.current.setExpiresAt(newExpiry)
        })

        // Advance timer by 60 seconds (remainingTime = 120s, refreshBuffer = 60s, delay = 60s)
        await act(async () => {
            vi.advanceTimersByTime(60 * 1000)
        })

        expect(refreshAccessTokenSpy).toHaveBeenCalled()
        expect(result.current.token).toBe("bg-refreshed-token")
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
            result.current.setExpiresAt(newExpiry)
        })

        await act(async () => {
            vi.advanceTimersByTime(60 * 1000)
        })

        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.token).toBe("")
        expect(logoutFromServerSpy).toHaveBeenCalledWith("initial-token")
    })

    it("deduplicates concurrent refreshAccessToken calls under React StrictMode so only one network request is sent", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                token: "strictmode-restored-token",
                expiresAt: "2026-12-01T00:00:00Z",
            }),
        } as Response)

        const StrictWrapper = ({ children }: { children: ReactNode }) => (
            <StrictMode>
                <AuthProvider>{children}</AuthProvider>
            </StrictMode>
        )

        const { result } = renderHook(() => useAuth(), {
            wrapper: StrictWrapper,
        })

        await act(async () => {
            await Promise.resolve()
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(result.current.isInitializing).toBe(false)
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.token).toBe("strictmode-restored-token")
    })
})


import { describe, it, expect } from "vitest"
import { parseJwt, getUserRoleFromToken, isUserAdmin } from "./jwt"

describe("JWT Utilities", () => {
    function createMockToken(payload: Record<string, unknown>): string {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
        const body = btoa(JSON.stringify(payload))
        const sig = "mock_signature"
        return `${header}.${body}.${sig}`
    }

    it("returns null for invalid or empty tokens", () => {
        expect(parseJwt("")).toBeNull()
        expect(parseJwt("invalid")).toBeNull()
        expect(parseJwt("a.b")).toBeNull()
    })

    it("extracts payload correctly", () => {
        const payload = { sub: "123", email: "user@example.com", role: "Admin" }
        const token = createMockToken(payload)
        const parsed = parseJwt(token)

        expect(parsed).not.toBeNull()
        expect(parsed?.sub).toBe("123")
        expect(parsed?.email).toBe("user@example.com")
        expect(parsed?.role).toBe("Admin")
    })

    it("identifies admin role from standard role claim", () => {
        const token = createMockToken({ role: "Admin" })
        expect(getUserRoleFromToken(token)).toBe("Admin")
        expect(isUserAdmin(token)).toBe(true)
    })

    it("identifies admin role from MS schema claim", () => {
        const token = createMockToken({
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
        })
        expect(getUserRoleFromToken(token)).toBe("Admin")
        expect(isUserAdmin(token)).toBe(true)
    })

    it("returns false for non-admin role", () => {
        const token = createMockToken({ role: "User" })
        expect(getUserRoleFromToken(token)).toBe("User")
        expect(isUserAdmin(token)).toBe(false)
    })

    it("returns false when role is missing", () => {
        const token = createMockToken({ sub: "123" })
        expect(getUserRoleFromToken(token)).toBeNull()
        expect(isUserAdmin(token)).toBe(false)
    })
})

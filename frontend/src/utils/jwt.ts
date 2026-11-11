export type JwtPayload = {
    sub?: string
    nameid?: string
    email?: string
    role?: string
    exp?: number
    [key: string]: unknown
}

export function parseJwt(token: string): JwtPayload | null {
    if (!token || typeof token !== "string") {
        return null
    }

    const parts = token.split(".")
    if (parts.length !== 3) {
        return null
    }

    try {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
        const padded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, "=")
        const json = atob(padded)
        return JSON.parse(json) as JwtPayload
    } catch {
        return null
    }
}

export function getUserRoleFromToken(token: string): string | null {
    const payload = parseJwt(token)
    if (!payload) return null

    // Standard ClaimTypes.Role in Microsoft JWT handler is:
    // "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" or "role"
    const msRoleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    const role = (payload[msRoleClaim] ?? payload.role) as string | undefined

    return role ?? null
}

export function isUserAdmin(token: string): boolean {
    const role = getUserRoleFromToken(token)
    return role?.toLowerCase() === "admin"
}

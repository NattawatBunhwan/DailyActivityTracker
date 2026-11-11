import { describe, it, expect } from "vitest"
import { resolveApiBaseUrl, API_BASE_URL } from "./config"

describe("resolveApiBaseUrl", () => {
    describe("Development mode (isProduction = false)", () => {
        it("resolves to https://localhost:7127 when envValue is undefined", () => {
            expect(resolveApiBaseUrl(undefined, false)).toBe("https://localhost:7127")
        })

        it("resolves to https://localhost:7127 when envValue is an empty string", () => {
            expect(resolveApiBaseUrl("", false)).toBe("https://localhost:7127")
        })

        it("resolves to https://localhost:7127 when envValue is a whitespace-only string", () => {
            expect(resolveApiBaseUrl("   ", false)).toBe("https://localhost:7127")
        })

        it("resolves https://api.example.com/ to https://api.example.com", () => {
            expect(resolveApiBaseUrl("https://api.example.com/", false)).toBe("https://api.example.com")
        })

        it("resolves https://api.example.com/// to https://api.example.com", () => {
            expect(resolveApiBaseUrl("https://api.example.com///", false)).toBe("https://api.example.com")
        })

        it("preserves a valid URL without trailing slashes", () => {
            expect(resolveApiBaseUrl("https://api.example.com", false)).toBe("https://api.example.com")
        })
    })

    describe("Production mode (isProduction = true)", () => {
        it("throws an actionable error when envValue is undefined in production", () => {
            expect(() => resolveApiBaseUrl(undefined, true)).toThrowError(
                /Missing required environment variable: VITE_API_BASE_URL/
            )
        })

        it("resolves to same-origin empty string when envValue is empty or whitespace in production", () => {
            expect(resolveApiBaseUrl("", true)).toBe("")
            expect(resolveApiBaseUrl("   ", true)).toBe("")
        })

        it("resolves root slash '/' to empty string for clean same-origin relative paths", () => {
            expect(resolveApiBaseUrl("/", true)).toBe("")
            expect(resolveApiBaseUrl("///", true)).toBe("")
        })

        it("resolves and normalizes valid production URL without trailing slashes", () => {
            expect(resolveApiBaseUrl("https://api.production.com", true)).toBe("https://api.production.com")
            expect(resolveApiBaseUrl("https://api.production.com/", true)).toBe("https://api.production.com")
            expect(resolveApiBaseUrl("https://api.production.com///", true)).toBe("https://api.production.com")
        })
    })

    describe("Default export", () => {
        it("exports API_BASE_URL and resolves correctly in the default test environment", () => {
            expect(API_BASE_URL).toBe("https://localhost:7127")
        })
    })
})


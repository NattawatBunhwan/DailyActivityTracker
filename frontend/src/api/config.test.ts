import { describe, it, expect } from "vitest"
import { resolveApiBaseUrl, API_BASE_URL } from "./config"

describe("resolveApiBaseUrl", () => {
    it("resolves to https://localhost:7127 when envValue is undefined", () => {
        expect(resolveApiBaseUrl(undefined)).toBe("https://localhost:7127")
    })

    it("resolves to https://localhost:7127 when envValue is an empty string", () => {
        expect(resolveApiBaseUrl("")).toBe("https://localhost:7127")
    })

    it("resolves to https://localhost:7127 when envValue is a whitespace-only string", () => {
        expect(resolveApiBaseUrl("   ")).toBe("https://localhost:7127")
    })

    it("resolves https://api.example.com/ to https://api.example.com", () => {
        expect(resolveApiBaseUrl("https://api.example.com/")).toBe("https://api.example.com")
    })

    it("resolves https://api.example.com/// to https://api.example.com", () => {
        expect(resolveApiBaseUrl("https://api.example.com///")).toBe("https://api.example.com")
    })

    it("preserves a valid URL without trailing slashes", () => {
        expect(resolveApiBaseUrl("https://api.example.com")).toBe("https://api.example.com")
    })

    it("exports API_BASE_URL and resolves correctly in the default test environment", () => {
        expect(API_BASE_URL).toBe("https://localhost:7127")
    })
})


import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it } from "vitest"
import {
	FEATURE_ACCESS,
	FEATURE_REGISTRY
} from "../../shared/config/features"

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url))
let nuxtConfig = ""
let authSource = ""
let middlewareSource = ""

beforeAll(async () => {
	[nuxtConfig, authSource, middlewareSource] = await Promise.all([
		readFile(resolve(repositoryRoot, "nuxt.config.ts"), "utf8"),
		readFile(resolve(repositoryRoot, "server/utils/anilist-auth.ts"), "utf8"),
		readFile(resolve(repositoryRoot, "app/middleware/Auth.global.ts"), "utf8")
	])
})

describe("security configuration regressions", () => {
	it("keeps baseline browser security headers enabled", () => {
		expect(nuxtConfig).toContain("\"X-Frame-Options\": \"DENY\"")
		expect(nuxtConfig).toContain("\"X-Content-Type-Options\": \"nosniff\"")
		expect(nuxtConfig).toContain("\"Referrer-Policy\": \"strict-origin-when-cross-origin\"")
		expect(nuxtConfig).toContain("\"Permissions-Policy\": \"camera=(), microphone=(), geolocation=()\"")
		expect(nuxtConfig).toContain("\"Cross-Origin-Opener-Policy\": \"same-origin\"")
	})

	it("keeps authentication responses out of shared caches", () => {
		expect(nuxtConfig).toMatch(/"\/api\/auth\/\*\*"[\s\S]*?"Cache-Control": "private, no-store"/)
		expect(nuxtConfig).toMatch(/"\/auth\/\*\*"[\s\S]*?"Cache-Control": "private, no-store"/)
	})

	it("does not expose server credentials through public runtime config", () => {
		const publicConfig = nuxtConfig.match(/public:\s*\{([\s\S]*?)\n\t\t\}/)?.[1]

		expect(publicConfig).toBeDefined()
		expect(publicConfig).not.toMatch(/clientSecret|sessionPassword|accessToken/i)
	})

	it("retains the OAuth and session hardening primitives", () => {
		expect(authSource).toContain("httpOnly: true")
		expect(authSource).toContain("sameSite: \"lax\"")
		expect(authSource).toMatch(
			/secure:\s*(?:isProduction\(\)\s*\|\|\s*)?getRequestURL\(event\)\.protocol === "https:"/
		)
		expect(authSource).toMatch(/createCipheriv\(\s*"aes-256-gcm"/)
		expect(authSource).toContain("timingSafeEqual(expected, received)")
		expect(authSource).toContain("randomBytes(32)")
	})

	it("keeps Calendar and Tierlist available without authentication", () => {
		expect(FEATURE_REGISTRY.calendar.access).toBe(FEATURE_ACCESS.optional)
		expect(FEATURE_REGISTRY.tierlist.access).toBe(FEATURE_ACCESS.optional)
		expect(middlewareSource).toContain("const access = to.meta.auth ?? FEATURE_ACCESS.oauth")
		expect(middlewareSource).not.toMatch(/\b(?:publicPaths|hybridPaths)\b/)
	})
})

import type { H3Event } from "h3"
import { createError as createH3Error } from "h3"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
import {
	assertSameOriginRequest,
	consumeOAuthTransaction,
	createOAuthTransaction,
	exchangeAuthorizationCode,
	fetchAniListViewer,
	getAniListSession,
	isSameOrigin,
	parseAuthorizationCode,
	setAniListSession
} from "../../server/utils/anilist-auth"

const EVENT = {} as H3Event
const CURRENT_PASSWORD = "c".repeat(48)
const PREVIOUS_PASSWORD = "p".repeat(48)
const ACCESS_TOKEN = "anitools-valid-access-token"
const USER = {
	id: 42,
	name: "AniTools tester",
	siteUrl: "https://anilist.co/user/42"
}

interface StoredCookie {
	value: string
	options: {
		httpOnly?: boolean
		maxAge?: number
		path?: string
		sameSite?: string
		secure?: boolean
	}
}

let runtimeConfig: {
	anilist: {
		clientId: string
		clientSecret: string
		redirectUri: string
	}
	sessionPassword: string
	sessionPreviousPassword: string
	siteUrl: string
}
let requestOrigin: string | undefined
let requestUrl: URL
let cookies: Map<string, StoredCookie>
let setCookieMock: ReturnType<typeof vi.fn>

beforeEach(() => {
	runtimeConfig = {
		anilist: {
			clientId: "1234",
			clientSecret: "client-secret",
			redirectUri: "https://anitools.example/auth/anilist/callback"
		},
		sessionPassword: CURRENT_PASSWORD,
		sessionPreviousPassword: "",
		siteUrl: "https://anitools.example"
	}
	requestOrigin = "https://anitools.example"
	requestUrl = new URL("https://anitools.example/api/auth/logout")
	cookies = new Map()
	setCookieMock = vi.fn((
		_event: unknown,
		name: string,
		value: string,
		options: StoredCookie["options"]
	) => {
		cookies.set(name, { value, options })
	})

	vi.stubGlobal("useRuntimeConfig", vi.fn(() => runtimeConfig))
	vi.stubGlobal("getRequestURL", vi.fn(() => requestUrl))
	vi.stubGlobal("getHeader", vi.fn(() => requestOrigin))
	vi.stubGlobal("setCookie", setCookieMock)
	vi.stubGlobal("getCookie", vi.fn((_event: unknown, name: string) => cookies.get(name)?.value))
	vi.stubGlobal("deleteCookie", vi.fn((_event: unknown, name: string) => cookies.delete(name)))
	vi.stubGlobal("createError", createH3Error)
	vi.stubGlobal("$fetch", vi.fn())
})

afterEach(() => {
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
})

describe("OAuth payload protection", () => {
	it("creates a bounded state in a versioned encrypted transaction", () => {
		const { transaction } = createOAuthTransaction(EVENT, "/calendar")
		const cookie = cookies.get("anitools-oauth")

		expect(transaction.state).toHaveLength(43)
		expect(cookie?.value).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u)
		expect(cookie?.options).toMatchObject({
			httpOnly: true,
			maxAge: 600,
			path: "/",
			sameSite: "lax",
			secure: true
		})
	})

	it("accepts an OAuth transaction encrypted with the previous rotation key", () => {
		runtimeConfig.sessionPassword = PREVIOUS_PASSWORD
		const { transaction } = createOAuthTransaction(EVENT, "/tierlist")

		runtimeConfig.sessionPassword = CURRENT_PASSWORD
		runtimeConfig.sessionPreviousPassword = PREVIOUS_PASSWORD

		expect(consumeOAuthTransaction(EVENT, transaction.state)?.transaction).toEqual(transaction)
	})

	it("cannot consume a session payload as an OAuth transaction", () => {
		const { transaction } = createOAuthTransaction(EVENT, "/calendar")
		const oauthCookie = cookies.get("anitools-oauth")
		expect(oauthCookie).toBeDefined()

		setAniListSession(EVENT, {
			access_token: ACCESS_TOKEN,
			expires_in: 3600,
			token_type: "Bearer"
		}, USER)
		const sessionCookie = cookies.get("anitools-session")
		expect(sessionCookie).toBeDefined()

		cookies.set("anitools-oauth", sessionCookie!)
		expect(consumeOAuthTransaction(EVENT, transaction.state)).toBeNull()
	})

	it("rejects states and authorization codes outside their bounds", () => {
		const { transaction } = createOAuthTransaction(EVENT, "/")

		expect(consumeOAuthTransaction(EVENT, transaction.state.slice(1))).toBeNull()
		expect(parseAuthorizationCode("short")).toBeNull()
		expect(parseAuthorizationCode("code with whitespace")).toBeNull()
		expect(parseAuthorizationCode("a".repeat(2049))).toBeNull()
		expect(parseAuthorizationCode("valid-code-1234")).toBe("valid-code-1234")
	})
})

describe("session hardening", () => {
	it("forces Secure and __Host- cookie names in production", () => {
		vi.stubEnv("NODE_ENV", "production")
		requestUrl = new URL("http://localhost:3000/auth/anilist")

		createOAuthTransaction(EVENT, "/")
		setAniListSession(EVENT, {
			access_token: ACCESS_TOKEN,
			expires_in: 3600
		}, USER)

		expect(cookies.get("__Host-anitools-oauth")?.options).toMatchObject({
			path: "/",
			secure: true
		})
		expect(cookies.get("__Host-anitools-session")?.options).toMatchObject({
			path: "/",
			secure: true
		})
		expect(cookies.has("anitools-oauth")).toBe(false)
		expect(cookies.has("anitools-session")).toBe(false)
	})

	it("rotates a valid session to the current key when read", () => {
		runtimeConfig.sessionPassword = PREVIOUS_PASSWORD
		setAniListSession(EVENT, {
			access_token: ACCESS_TOKEN,
			expires_in: 3600
		}, USER)
		const previousCookie = cookies.get("anitools-session")?.value

		runtimeConfig.sessionPassword = CURRENT_PASSWORD
		runtimeConfig.sessionPreviousPassword = PREVIOUS_PASSWORD
		setCookieMock.mockClear()

		expect(getAniListSession(EVENT)?.user.id).toBe(USER.id)
		expect(setCookieMock).toHaveBeenCalledOnce()
		expect(cookies.get("anitools-session")?.value).not.toBe(previousCookie)

		runtimeConfig.sessionPreviousPassword = ""
		expect(getAniListSession(EVENT)?.user.id).toBe(USER.id)
	})

	it("rejects an unbounded expires_in value from AniList", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			access_token: ACCESS_TOKEN,
			expires_in: 365 * 24 * 60 * 60 + 1,
			token_type: "Bearer"
		})
		vi.stubGlobal("$fetch", fetchMock)

		await expect(exchangeAuthorizationCode({
			...runtimeConfig.anilist,
			sessionPassword: CURRENT_PASSWORD
		}, "valid-code-1234")).rejects.toMatchObject({
			statusCode: 502
		})
		expect(fetchMock).toHaveBeenCalledWith(
			"https://anilist.co/api/v2/oauth/token",
			expect.objectContaining({
				retry: 0,
				timeout: 10_000
			})
		)
	})

	it("validates the AniList viewer response and applies a timeout", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			data: {
				Viewer: USER
			}
		})
		vi.stubGlobal("$fetch", fetchMock)

		await expect(fetchAniListViewer(ACCESS_TOKEN)).resolves.toMatchObject(USER)
		expect(fetchMock).toHaveBeenCalledWith(
			"https://graphql.anilist.co",
			expect.objectContaining({
				retry: 0,
				timeout: 10_000
			})
		)

		fetchMock.mockResolvedValueOnce({
			data: {
				Viewer: {
					id: "not-a-number",
					name: "Invalid"
				}
			}
		})
		await expect(fetchAniListViewer(ACCESS_TOKEN)).rejects.toMatchObject({
			statusCode: 502
		})

		fetchMock.mockResolvedValueOnce({
			data: {
				Viewer: {
					...USER,
					siteUrl: "javascript:alert(1)"
				}
			}
		})
		await expect(fetchAniListViewer(ACCESS_TOKEN)).rejects.toMatchObject({
			statusCode: 502
		})
	})
})

describe("logout origin protection", () => {
	it.each([
		["https://anitools.example", "https://anitools.example", true],
		["https://anitools.example/", "https://anitools.example", true],
		["https://evil.example", "https://anitools.example", false],
		["https://anitools.example/path", "https://anitools.example", false],
		[undefined, "https://anitools.example", false]
	])("compares %s with %s", (origin, expectedOrigin, expected) => {
		expect(isSameOrigin(origin, expectedOrigin)).toBe(expected)
	})

	it("rejects a logout request from another origin", () => {
		requestOrigin = "https://evil.example"

		expect(() => assertSameOriginRequest(EVENT)).toThrowError(
			expect.objectContaining({
				statusCode: 403
			})
		)
	})

	it("accepts a logout request from the configured site origin", () => {
		expect(() => assertSameOriginRequest(EVENT)).not.toThrow()
	})

	it("fails closed in production when the trusted site origin is not configured", () => {
		vi.stubEnv("NODE_ENV", "production")
		runtimeConfig.siteUrl = ""

		expect(() => assertSameOriginRequest(EVENT)).toThrowError(
			expect.objectContaining({
				statusCode: 403
			})
		)
	})
})

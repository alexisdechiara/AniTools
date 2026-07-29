import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	timingSafeEqual
} from "node:crypto"
import type { H3Event } from "h3"
import * as z from "zod"

const LEGACY_SESSION_COOKIE_NAME = "anitools-session"
const LEGACY_OAUTH_COOKIE_NAME = "anitools-oauth"
const PRODUCTION_SESSION_COOKIE_NAME = "__Host-anitools-session"
const PRODUCTION_OAUTH_COOKIE_NAME = "__Host-anitools-oauth"
const OAUTH_COOKIE_MAX_AGE = 10 * 60
const DEFAULT_TOKEN_MAX_AGE = 365 * 24 * 60 * 60
const MAX_TOKEN_MAX_AGE = 365 * 24 * 60 * 60
const TOKEN_REQUEST_TIMEOUT = 10_000
const VIEWER_REQUEST_TIMEOUT = 10_000
const MAX_SEALED_VALUE_LENGTH = 16_384
const CRYPTO_VERSION = "v1"
const OAUTH_PURPOSE = "oauth-transaction"
const SESSION_PURPOSE = "session"
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u

const HttpUrlSchema = z.string().url().max(2048).refine((value) => {
	const protocol = new URL(value).protocol
	return protocol === "http:" || protocol === "https:"
})
const NullableUrlSchema = HttpUrlSchema.nullable().optional()
const NullableShortStringSchema = z.string().max(128).nullable().optional()

export const AniListUserSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1).max(100),
	avatar: z.object({
		large: NullableUrlSchema,
		medium: NullableUrlSchema
	}).nullable().optional(),
	siteUrl: NullableUrlSchema,
	updatedAt: z.number().int().nonnegative().nullable().optional(),
	options: z.object({
		titleLanguage: NullableShortStringSchema,
		displayAdultContent: z.boolean().nullable().optional(),
		profileColor: NullableShortStringSchema,
		timezone: NullableShortStringSchema
	}).nullable().optional(),
	mediaListOptions: z.object({
		scoreFormat: NullableShortStringSchema,
		rowOrder: NullableShortStringSchema
	}).nullable().optional()
})

const OAuthStateSchema = z
	.string()
	.length(43)
	.regex(BASE64URL_PATTERN)

export const AuthorizationCodeSchema = z
	.string()
	.min(8)
	.max(2048)
	.refine(value => !/\s/u.test(value), "Authorization code cannot contain whitespace")

export const OAuthTransactionSchema = z.object({
	state: OAuthStateSchema,
	returnTo: z.string().min(1).max(2048).startsWith("/"),
	createdAt: z.number().int().positive()
}).strict()

export const AniListTokenResponseSchema = z.object({
	access_token: z.string().min(16).max(4096),
	expires_in: z.number().int().positive().max(MAX_TOKEN_MAX_AGE).optional(),
	token_type: z.string().min(1).max(32).optional()
})

const AniListViewerResponseSchema = z.object({
	data: z.object({
		Viewer: AniListUserSchema.nullable().optional()
	}).optional(),
	errors: z.array(z.object({
		message: z.string().max(1000).optional()
	})).max(10).optional()
})

export const AniListSessionSchema = z.object({
	accessToken: z.string().min(16).max(4096),
	expiresAt: z.number().int().positive(),
	user: AniListUserSchema
}).strict()

export const AniListSessionResponseSchema = z.discriminatedUnion("authenticated", [
	z.object({
		authenticated: z.literal(true),
		expiresAt: z.number().int().positive(),
		user: AniListUserSchema
	}).strict(),
	z.object({
		authenticated: z.literal(false),
		expiresAt: z.null(),
		user: z.null()
	}).strict()
])

const AniListAuthConfigSchema = z.object({
	clientId: z.string().min(1).max(128),
	clientSecret: z.string().min(1).max(1024),
	redirectUri: z.string().url().max(2048).refine((value) => {
		const protocol = new URL(value).protocol
		return protocol === "http:" || protocol === "https:"
	}),
	sessionPassword: z.string().min(32).max(1024),
	sessionPreviousPassword: z.string().min(32).max(1024).optional()
}).strict()

export type AniListUser = z.infer<typeof AniListUserSchema>
export type AniListSession = z.infer<typeof AniListSessionSchema>
export type AniListTokenResponse = z.infer<typeof AniListTokenResponseSchema>

export interface AniListAuthConfig {
	clientId: string
	clientSecret: string
	redirectUri: string
	sessionPassword: string
	sessionPreviousPassword?: string
}

type CryptoPurpose = typeof OAUTH_PURPOSE | typeof SESSION_PURPOSE

function isProduction() {
	return process.env.NODE_ENV === "production"
}

function getCookieNames() {
	if (isProduction()) {
		return {
			oauth: PRODUCTION_OAUTH_COOKIE_NAME,
			session: PRODUCTION_SESSION_COOKIE_NAME
		}
	}

	return {
		oauth: LEGACY_OAUTH_COOKIE_NAME,
		session: LEGACY_SESSION_COOKIE_NAME
	}
}

function getAuthConfig(event: H3Event): AniListAuthConfig {
	const config = useRuntimeConfig(event)
	const previousPassword = String(config.sessionPreviousPassword || "").trim()

	return {
		clientId: String(config.anilist?.clientId || "").trim(),
		clientSecret: String(config.anilist?.clientSecret || ""),
		redirectUri: String(config.anilist?.redirectUri || "").trim(),
		sessionPassword: String(config.sessionPassword || ""),
		...(previousPassword ? { sessionPreviousPassword: previousPassword } : {})
	}
}

function requireAuthConfig(event: H3Event): AniListAuthConfig {
	const config = getAuthConfig(event)
	const parsed = AniListAuthConfigSchema.safeParse(config)

	if (!parsed.success) {
		const missing = [
			!config.clientId && "NUXT_ANILIST_CLIENT_ID",
			!config.clientSecret && "NUXT_ANILIST_CLIENT_SECRET",
			!config.redirectUri && "NUXT_ANILIST_REDIRECT_URI",
			config.sessionPassword.length < 32 && "NUXT_SESSION_PASSWORD (32+ characters)",
			config.sessionPreviousPassword !== undefined
				&& config.sessionPreviousPassword.length < 32
				&& "NUXT_SESSION_PREVIOUS_PASSWORD (32+ characters when set)"
		].filter(Boolean)

		throw createError({
			statusCode: 503,
			statusMessage: `AniList authentication is not configured correctly: ${
				missing.length ? missing.join(", ") : "invalid OAuth configuration"
			}`
		})
	}

	return parsed.data
}

function getEncryptionKey(password: string, purpose: CryptoPurpose) {
	return createHash("sha256")
		.update(`anitools:${CRYPTO_VERSION}:${purpose}\0`, "utf8")
		.update(password, "utf8")
		.digest()
}

function getAdditionalAuthenticatedData(purpose: CryptoPurpose) {
	return Buffer.from(`anitools:${CRYPTO_VERSION}:${purpose}`, "utf8")
}

function seal(value: unknown, password: string, purpose: CryptoPurpose) {
	const initializationVector = randomBytes(12)
	const cipher = createCipheriv(
		"aes-256-gcm",
		getEncryptionKey(password, purpose),
		initializationVector
	)
	cipher.setAAD(getAdditionalAuthenticatedData(purpose))

	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(value), "utf8"),
		cipher.final()
	])
	const authenticationTag = cipher.getAuthTag()

	return [
		CRYPTO_VERSION,
		initializationVector.toString("base64url"),
		authenticationTag.toString("base64url"),
		encrypted.toString("base64url")
	].join(".")
}

function unseal(
	value: string,
	password: string,
	purpose: CryptoPurpose
): unknown | null {
	try {
		if (!value || value.length > MAX_SEALED_VALUE_LENGTH) return null

		const parts = value.split(".")
		if (parts.length !== 4) return null

		const [version, initializationVectorValue, authenticationTagValue, encryptedValue] = parts
		if (
			version !== CRYPTO_VERSION
			|| !initializationVectorValue
			|| !authenticationTagValue
			|| !encryptedValue
			|| !BASE64URL_PATTERN.test(initializationVectorValue)
			|| !BASE64URL_PATTERN.test(authenticationTagValue)
			|| !BASE64URL_PATTERN.test(encryptedValue)
		) {
			return null
		}

		const initializationVector = Buffer.from(initializationVectorValue, "base64url")
		const authenticationTag = Buffer.from(authenticationTagValue, "base64url")
		if (initializationVector.length !== 12 || authenticationTag.length !== 16) return null

		const decipher = createDecipheriv(
			"aes-256-gcm",
			getEncryptionKey(password, purpose),
			initializationVector
		)
		decipher.setAAD(getAdditionalAuthenticatedData(purpose))
		decipher.setAuthTag(authenticationTag)

		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(encryptedValue, "base64url")),
			decipher.final()
		])

		return JSON.parse(decrypted.toString("utf8")) as unknown
	} catch {
		return null
	}
}

function unsealWithRotation<T>(
	value: string,
	config: Pick<AniListAuthConfig, "sessionPassword" | "sessionPreviousPassword">,
	purpose: CryptoPurpose,
	schema: z.ZodType<T>
) {
	const current = schema.safeParse(unseal(value, config.sessionPassword, purpose))
	if (current.success) {
		return {
			value: current.data,
			usedPreviousPassword: false
		}
	}

	if (!config.sessionPreviousPassword) return null

	const previous = schema.safeParse(unseal(value, config.sessionPreviousPassword, purpose))
	if (!previous.success) return null

	return {
		value: previous.data,
		usedPreviousPassword: true
	}
}

function cookieOptions(event: H3Event, maxAge: number) {
	return {
		httpOnly: true,
		maxAge,
		path: "/",
		sameSite: "lax" as const,
		secure: isProduction() || getRequestURL(event).protocol === "https:"
	}
}

function deleteOAuthCookie(event: H3Event) {
	const cookieName = getCookieNames().oauth
	deleteCookie(event, cookieName, cookieOptions(event, 0))

	if (cookieName !== LEGACY_OAUTH_COOKIE_NAME) {
		deleteCookie(event, LEGACY_OAUTH_COOKIE_NAME, cookieOptions(event, 0))
	}
}

function deleteSessionCookie(event: H3Event) {
	const cookieName = getCookieNames().session
	deleteCookie(event, cookieName, cookieOptions(event, 0))

	if (cookieName !== LEGACY_SESSION_COOKIE_NAME) {
		deleteCookie(event, LEGACY_SESSION_COOKIE_NAME, cookieOptions(event, 0))
	}
}

function getConfiguredOrigin(event: H3Event) {
	const config = useRuntimeConfig(event)
	const configuredSiteUrl = String(config.siteUrl || "").trim()

	if (configuredSiteUrl) {
		try {
			return new URL(configuredSiteUrl).origin
		} catch {
			return null
		}
	}

	if (isProduction()) return null

	return getRequestURL(event).origin
}

export function isSameOrigin(origin: unknown, expectedOrigin: unknown) {
	if (typeof origin !== "string" || typeof expectedOrigin !== "string") return false

	try {
		const normalizedOrigin = new URL(origin)
		const normalizedExpectedOrigin = new URL(expectedOrigin)

		return normalizedOrigin.origin === normalizedExpectedOrigin.origin
			&& normalizedOrigin.pathname === "/"
			&& normalizedOrigin.search === ""
			&& normalizedOrigin.hash === ""
	} catch {
		return false
	}
}

export function assertSameOriginRequest(event: H3Event) {
	const origin = getHeader(event, "origin")
	const expectedOrigin = getConfiguredOrigin(event)

	if (!expectedOrigin || !isSameOrigin(origin, expectedOrigin)) {
		throw createError({
			statusCode: 403,
			statusMessage: "Invalid request origin"
		})
	}
}

export function sanitizeReturnTo(value: unknown) {
	if (
		typeof value !== "string"
		|| value.length > 2048
		|| !value.startsWith("/")
		|| value.startsWith("//")
		|| value.includes("\\")
	) {
		return "/"
	}

	try {
		const parsed = new URL(value, "https://anitools.local")
		if (parsed.origin !== "https://anitools.local") return "/"

		const sanitized = `${parsed.pathname}${parsed.search}${parsed.hash}`
		return sanitized.length <= 2048 ? sanitized : "/"
	} catch {
		return "/"
	}
}

export function parseAuthorizationCode(value: unknown) {
	const parsed = AuthorizationCodeSchema.safeParse(value)
	return parsed.success ? parsed.data : null
}

export function createOAuthTransaction(event: H3Event, returnTo: unknown) {
	const config = requireAuthConfig(event)
	const transaction = OAuthTransactionSchema.parse({
		state: randomBytes(32).toString("base64url"),
		returnTo: sanitizeReturnTo(returnTo),
		createdAt: Date.now()
	})

	setCookie(
		event,
		getCookieNames().oauth,
		seal(transaction, config.sessionPassword, OAUTH_PURPOSE),
		cookieOptions(event, OAUTH_COOKIE_MAX_AGE)
	)

	return {
		config,
		transaction
	}
}

export function consumeOAuthTransaction(event: H3Event, receivedState: unknown) {
	const config = requireAuthConfig(event)
	const cookie = getCookie(event, getCookieNames().oauth)
	deleteOAuthCookie(event)

	const parsedState = OAuthStateSchema.safeParse(receivedState)
	if (!cookie || !parsedState.success) return null

	const unsealed = unsealWithRotation(
		cookie,
		config,
		OAUTH_PURPOSE,
		OAuthTransactionSchema
	)
	if (!unsealed) return null

	const age = Date.now() - unsealed.value.createdAt
	if (age < -60_000 || age > OAUTH_COOKIE_MAX_AGE * 1000) return null

	const expected = Buffer.from(unsealed.value.state)
	const received = Buffer.from(parsedState.data)
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

	return {
		config,
		transaction: unsealed.value
	}
}

export async function exchangeAuthorizationCode(
	config: AniListAuthConfig,
	code: string
) {
	const parsedCode = AuthorizationCodeSchema.safeParse(code)
	if (!parsedCode.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid AniList authorization code"
		})
	}

	const response = await $fetch<unknown>("https://anilist.co/api/v2/oauth/token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: {
			grant_type: "authorization_code",
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri,
			code: parsedCode.data
		},
		retry: 0,
		timeout: TOKEN_REQUEST_TIMEOUT
	})

	const token = AniListTokenResponseSchema.safeParse(response)
	if (!token.success) {
		throw createError({
			statusCode: 502,
			statusMessage: "AniList returned an invalid token response"
		})
	}

	return token.data
}

export async function fetchAniListViewer(accessToken: string) {
	const parsedAccessToken = AniListTokenResponseSchema.shape.access_token.safeParse(accessToken)
	if (!parsedAccessToken.success) {
		throw createError({
			statusCode: 401,
			statusMessage: "Invalid AniList access token"
		})
	}

	const rawResponse = await $fetch<unknown>("https://graphql.anilist.co", {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${parsedAccessToken.data}`,
			"Content-Type": "application/json"
		},
		body: {
			query: `query Viewer {
				Viewer {
					id
					name
					avatar { large medium }
					siteUrl
					updatedAt
					options {
						titleLanguage
						displayAdultContent
						profileColor
						timezone
					}
					mediaListOptions {
						scoreFormat
						rowOrder
					}
				}
			}`
		},
		retry: 0,
		timeout: VIEWER_REQUEST_TIMEOUT
	})

	const response = AniListViewerResponseSchema.safeParse(rawResponse)
	if (!response.success) {
		throw createError({
			statusCode: 502,
			statusMessage: "AniList returned an invalid viewer response"
		})
	}

	const viewer = response.data.data?.Viewer
	if (!viewer) {
		throw createError({
			statusCode: 502,
			statusMessage: response.data.errors?.[0]?.message || "Unable to load the AniList viewer"
		})
	}

	return viewer
}

export function setAniListSession(
	event: H3Event,
	token: AniListTokenResponse,
	user: AniListUser
) {
	const config = requireAuthConfig(event)
	const parsedToken = AniListTokenResponseSchema.safeParse(token)
	const parsedUser = AniListUserSchema.safeParse(user)
	if (!parsedToken.success || !parsedUser.success) {
		throw createError({
			statusCode: 502,
			statusMessage: "Cannot create a session from an invalid AniList response"
		})
	}

	const maxAge = parsedToken.data.expires_in ?? DEFAULT_TOKEN_MAX_AGE
	const session = AniListSessionSchema.parse({
		accessToken: parsedToken.data.access_token,
		expiresAt: Date.now() + maxAge * 1000,
		user: parsedUser.data
	})

	setCookie(
		event,
		getCookieNames().session,
		seal(session, config.sessionPassword, SESSION_PURPOSE),
		cookieOptions(event, maxAge)
	)
}

export function getAniListSession(event: H3Event) {
	const config = getAuthConfig(event)
	const cookie = getCookie(event, getCookieNames().session)
	if (!cookie || !AniListAuthConfigSchema.shape.sessionPassword.safeParse(config.sessionPassword).success) {
		return null
	}

	const unsealed = unsealWithRotation(cookie, config, SESSION_PURPOSE, AniListSessionSchema)
	const now = Date.now()
	if (
		!unsealed
		|| unsealed.value.expiresAt <= now
		|| unsealed.value.expiresAt - now > MAX_TOKEN_MAX_AGE * 1000 + 60_000
	) {
		clearAniListSession(event)
		return null
	}

	if (unsealed.usedPreviousPassword) {
		const remainingMaxAge = Math.max(1, Math.ceil((unsealed.value.expiresAt - now) / 1000))
		setCookie(
			event,
			getCookieNames().session,
			seal(unsealed.value, config.sessionPassword, SESSION_PURPOSE),
			cookieOptions(event, remainingMaxAge)
		)
	}

	return unsealed.value
}

export function clearAniListSession(event: H3Event) {
	deleteSessionCookie(event)
}

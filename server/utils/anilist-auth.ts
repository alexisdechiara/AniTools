import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
	timingSafeEqual
} from "node:crypto"
import type { H3Event } from "h3"

const SESSION_COOKIE_NAME = "anitools-session"
const OAUTH_COOKIE_NAME = "anitools-oauth"
const OAUTH_COOKIE_MAX_AGE = 10 * 60
const DEFAULT_TOKEN_MAX_AGE = 365 * 24 * 60 * 60

export interface AniListUser {
	id: number
	name: string
	avatar?: {
		large?: string | null
		medium?: string | null
	} | null
	siteUrl?: string | null
	updatedAt?: number | null
	options?: {
		titleLanguage?: string | null
		displayAdultContent?: boolean | null
		profileColor?: string | null
		timezone?: string | null
	} | null
	mediaListOptions?: {
		scoreFormat?: string | null
		rowOrder?: string | null
	} | null
}

export interface AniListSession {
	accessToken: string
	expiresAt: number
	user: AniListUser
}

interface OAuthTransaction {
	state: string
	returnTo: string
	createdAt: number
}

interface AniListAuthConfig {
	clientId: string
	clientSecret: string
	redirectUri: string
	sessionPassword: string
}

interface AniListTokenResponse {
	access_token: string
	expires_in?: number
	token_type?: string
}

interface AniListViewerResponse {
	data?: {
		Viewer?: AniListUser | null
	}
	errors?: Array<{
		message?: string
	}>
}

function getAuthConfig(event: H3Event): AniListAuthConfig {
	const config = useRuntimeConfig(event)

	return {
		clientId: String(config.anilist?.clientId || ""),
		clientSecret: String(config.anilist?.clientSecret || ""),
		redirectUri: String(config.anilist?.redirectUri || ""),
		sessionPassword: String(config.sessionPassword || "")
	}
}

function requireAuthConfig(event: H3Event): AniListAuthConfig {
	const config = getAuthConfig(event)
	const missing = [
		!config.clientId && "NUXT_ANILIST_CLIENT_ID",
		!config.clientSecret && "NUXT_ANILIST_CLIENT_SECRET",
		!config.redirectUri && "NUXT_ANILIST_REDIRECT_URI",
		config.sessionPassword.length < 32 && "NUXT_SESSION_PASSWORD (32+ characters)"
	].filter(Boolean)

	if (missing.length) {
		throw createError({
			statusCode: 503,
			statusMessage: `AniList authentication is not configured: ${missing.join(", ")}`
		})
	}

	return config
}

function getEncryptionKey(password: string) {
	return createHash("sha256").update(password, "utf8").digest()
}

function seal(value: unknown, password: string) {
	const initializationVector = randomBytes(12)
	const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(password), initializationVector)
	const encrypted = Buffer.concat([
		cipher.update(JSON.stringify(value), "utf8"),
		cipher.final()
	])
	const authenticationTag = cipher.getAuthTag()

	return [
		initializationVector.toString("base64url"),
		authenticationTag.toString("base64url"),
		encrypted.toString("base64url")
	].join(".")
}

function unseal<T>(value: string, password: string): T | null {
	try {
		const [initializationVector, authenticationTag, encrypted] = value.split(".")
		if (!initializationVector || !authenticationTag || !encrypted) return null

		const decipher = createDecipheriv(
			"aes-256-gcm",
			getEncryptionKey(password),
			Buffer.from(initializationVector, "base64url")
		)
		decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"))

		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(encrypted, "base64url")),
			decipher.final()
		])

		return JSON.parse(decrypted.toString("utf8")) as T
	} catch {
		return null
	}
}

function cookieOptions(event: H3Event, maxAge: number) {
	return {
		httpOnly: true,
		maxAge,
		path: "/",
		sameSite: "lax" as const,
		secure: getRequestURL(event).protocol === "https:"
	}
}

export function sanitizeReturnTo(value: unknown) {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
		return "/"
	}

	try {
		const parsed = new URL(value, "https://anitools.local")
		if (parsed.origin !== "https://anitools.local") return "/"
		return `${parsed.pathname}${parsed.search}${parsed.hash}`
	} catch {
		return "/"
	}
}

export function createOAuthTransaction(event: H3Event, returnTo: unknown) {
	const config = requireAuthConfig(event)
	const transaction: OAuthTransaction = {
		state: randomBytes(32).toString("base64url"),
		returnTo: sanitizeReturnTo(returnTo),
		createdAt: Date.now()
	}

	setCookie(
		event,
		OAUTH_COOKIE_NAME,
		seal(transaction, config.sessionPassword),
		cookieOptions(event, OAUTH_COOKIE_MAX_AGE)
	)

	return {
		config,
		transaction
	}
}

export function consumeOAuthTransaction(event: H3Event, receivedState: unknown) {
	const config = requireAuthConfig(event)
	const cookie = getCookie(event, OAUTH_COOKIE_NAME)
	deleteCookie(event, OAUTH_COOKIE_NAME, cookieOptions(event, 0))

	if (!cookie || typeof receivedState !== "string") return null

	const transaction = unseal<OAuthTransaction>(cookie, config.sessionPassword)
	if (!transaction || Date.now() - transaction.createdAt > OAUTH_COOKIE_MAX_AGE * 1000) return null

	const expected = Buffer.from(transaction.state)
	const received = Buffer.from(receivedState)
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

	return {
		config,
		transaction
	}
}

export async function exchangeAuthorizationCode(
	config: AniListAuthConfig,
	code: string
) {
	const token = await $fetch<AniListTokenResponse>("https://anilist.co/api/v2/oauth/token", {
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
			code
		}
	})

	if (!token.access_token) {
		throw createError({
			statusCode: 502,
			statusMessage: "AniList did not return an access token"
		})
	}

	return token
}

export async function fetchAniListViewer(accessToken: string) {
	const response = await $fetch<AniListViewerResponse>("https://graphql.anilist.co", {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${accessToken}`,
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
		}
	})

	const viewer = response.data?.Viewer
	if (!viewer) {
		throw createError({
			statusCode: 502,
			statusMessage: response.errors?.[0]?.message || "Unable to load the AniList viewer"
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
	const maxAge = Math.max(60, Number(token.expires_in) || DEFAULT_TOKEN_MAX_AGE)
	const session: AniListSession = {
		accessToken: token.access_token,
		expiresAt: Date.now() + maxAge * 1000,
		user
	}

	setCookie(
		event,
		SESSION_COOKIE_NAME,
		seal(session, config.sessionPassword),
		cookieOptions(event, maxAge)
	)
}

export function getAniListSession(event: H3Event) {
	const config = getAuthConfig(event)
	const cookie = getCookie(event, SESSION_COOKIE_NAME)
	if (!cookie || config.sessionPassword.length < 32) return null

	const session = unseal<AniListSession>(cookie, config.sessionPassword)
	if (
		!session
		|| !session.accessToken
		|| !session.user?.id
		|| !session.expiresAt
		|| session.expiresAt <= Date.now()
	) {
		clearAniListSession(event)
		return null
	}

	return session
}

export function clearAniListSession(event: H3Event) {
	deleteCookie(event, SESSION_COOKIE_NAME, cookieOptions(event, 0))
}

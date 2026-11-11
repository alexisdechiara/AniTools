import {
	createError,
	isError,
	setResponseHeader,
	type H3Event
} from "h3"
import type { AniListAccessMode } from "~~/shared/types/anilist"
import {
	usernameSchema,
	accessSchema,
	type AniListAccess,
	invalidQuery
} from "./schemas"

export async function resolveAniListAccess(
	event: H3Event,
	publicUsername?: string
): Promise<AniListAccess> {
	if (publicUsername !== undefined) {
		const username = usernameSchema.safeParse(publicUsername)
		if (!username.success) throw invalidQuery(username.error)

		return {
			mode: "public",
			username: username.data
		}
	}

	const { getAniListSession } = await import("~~/server/utils/anilist-auth")
	const session = getAniListSession(event)
	if (!session) {
		throw createError({
			statusCode: 401,
			statusMessage: "Sign in with AniList or provide a public username"
		})
	}

	return accessSchema.parse({
		mode: "oauth",
		username: session.user.name,
		userId: session.user.id,
		accessToken: session.accessToken
	})
}

export function setAniListResponseCache(
	event: H3Event,
	mode: AniListAccessMode,
	publicMaxAge = 60
) {
	setResponseHeader(
		event,
		"Cache-Control",
		mode === "oauth"
			? "private, no-store"
			: `public, max-age=${publicMaxAge}, stale-while-revalidate=${publicMaxAge * 5}`
	)
}

export function forwardAniListRateLimit(event: H3Event, error: unknown) {
	if (!isError(error) || error.statusCode !== 429) return

	const data = typeof error.data === "object" && error.data !== null
		? error.data as Record<string, unknown>
		: null
	const retryAfter = data?.retryAfter
	if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
		setResponseHeader(event, "Retry-After", Math.max(1, Math.ceil(retryAfter)))
	}
}

/**
 * Error path shared by every AniList route. A failure must never keep the public cache
 * header set for the success path, and a rejected token means the session is dead.
 */
export async function handleAniListRouteError(
	event: H3Event,
	error: unknown,
	access?: AniListAccess | null
) {
	setResponseHeader(event, "Cache-Control", "private, no-store")
	forwardAniListRateLimit(event, error)

	const code = isError(error) && typeof error.data === "object" && error.data !== null
		? (error.data as Record<string, unknown>).code
		: undefined
	if (code === "ANILIST_UNAUTHORIZED" && access?.mode === "oauth") {
		const { clearAniListSession } = await import("~~/server/utils/anilist-auth")
		clearAniListSession(event)
	}
}

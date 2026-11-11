import { defineEventHandler, getQuery } from "h3"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	handleAniListRouteError,
	resolveAniListAccess,
	setAniListResponseCache
} from "./http"
import type { AniListAccess } from "./schemas"

/**
 * The shape shared by the username-based AniList GET routes: rate limit first, then parse the
 * query, resolve public or OAuth access, set the cache header and map failures.
 */
export function defineAniListRoute<Query extends { username?: string }, Result>(config: {
	namespace: string
	limit: number
	publicMaxAge?: number
	parse: (query: unknown) => Query
	run: (access: AniListAccess, query: Query) => Promise<Result>
}) {
	return defineEventHandler(async (event) => {
		enforceRateLimit(event, { namespace: config.namespace, limit: config.limit, windowMs: 60_000 })
		const query = config.parse(getQuery(event))
		const access = await resolveAniListAccess(event, query.username)
		setAniListResponseCache(event, access.mode, config.publicMaxAge)
		try {
			return await config.run(access, query)
		} catch (error) {
			await handleAniListRouteError(event, error, access)
			throw error
		}
	})
}

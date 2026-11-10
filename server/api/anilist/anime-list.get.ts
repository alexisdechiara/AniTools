import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	getAniListAnimeListResponse,
	handleAniListRouteError,
	parseAniListAnimeListQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-anime-list",
		limit: 30,
		windowMs: 60_000
	})

	const query = parseAniListAnimeListQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 60)

	try {
		return await getAniListAnimeListResponse(access, query)
	} catch (error) {
		await handleAniListRouteError(event, error, access)
		throw error
	}
})

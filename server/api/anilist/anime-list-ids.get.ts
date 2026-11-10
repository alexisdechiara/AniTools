import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	getAniListAnimeListIdsResponse,
	handleAniListRouteError,
	parseAniListProfileQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-anime-list-ids",
		limit: 12,
		windowMs: 60_000
	})

	const query = parseAniListProfileQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 300)

	try {
		return await getAniListAnimeListIdsResponse(access)
	} catch (error) {
		await handleAniListRouteError(event, error, access)
		throw error
	}
})

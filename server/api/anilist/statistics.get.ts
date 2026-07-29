import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	forwardAniListRateLimit,
	getAniListStatisticsResponse,
	parseAniListStatisticsQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-statistics",
		limit: 20,
		windowMs: 60_000
	})

	const query = parseAniListStatisticsQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 300)

	try {
		return await getAniListStatisticsResponse(access)
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

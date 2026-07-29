import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	forwardAniListRateLimit,
	getAniListRecommendationsResponse,
	parseAniListRecommendationsQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-recommendations",
		limit: 24,
		windowMs: 60_000
	})

	const query = parseAniListRecommendationsQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 300)

	try {
		return await getAniListRecommendationsResponse(access, query)
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

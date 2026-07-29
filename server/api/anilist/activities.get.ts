import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	forwardAniListRateLimit,
	getAniListActivitiesResponse,
	parseAniListActivitiesQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-activities",
		limit: 30,
		windowMs: 60_000
	})

	const query = parseAniListActivitiesQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 30)

	try {
		return await getAniListActivitiesResponse(access, query)
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

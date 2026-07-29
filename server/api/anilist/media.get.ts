import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	forwardAniListRateLimit,
	getAniListMediaResponse,
	parseAniListMediaQuery,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-media",
		limit: 30,
		windowMs: 60_000
	})

	const query = parseAniListMediaQuery(getQuery(event))
	setAniListResponseCache(event, "public", 300)

	try {
		return await getAniListMediaResponse(query)
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	getAniListStudioMediaResponse,
	handleAniListRouteError,
	parseAniListStudioMediaQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-studio-media",
		limit: 24,
		windowMs: 60_000
	})

	const query = parseAniListStudioMediaQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 300)

	try {
		return await getAniListStudioMediaResponse(access, query)
	} catch (error) {
		await handleAniListRouteError(event, error, access)
		throw error
	}
})

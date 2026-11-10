import { enforceRateLimit } from "~~/server/utils/rate-limit"
import {
	getAniListAnimeCollectionResponse,
	handleAniListRouteError,
	parseAniListProfileQuery,
	resolveAniListAccess,
	setAniListResponseCache
} from "~~/server/utils/anilist-client"

// The whole anime list in as few upstream requests as AniList allows (500 entries each).
export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "anilist-anime-collection",
		limit: 12,
		windowMs: 60_000
	})

	const query = parseAniListProfileQuery(getQuery(event))
	const access = await resolveAniListAccess(event, query.username)
	setAniListResponseCache(event, access.mode, 60)

	try {
		return await getAniListAnimeCollectionResponse(access)
	} catch (error) {
		await handleAniListRouteError(event, error, access)
		throw error
	}
})

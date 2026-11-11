import {
	getAniListAnimeCollectionResponse,
	parseAniListProfileQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

// The whole anime list in as few upstream requests as AniList allows (500 entries each).
export default defineAniListRoute({
	namespace: "anilist-anime-collection",
	limit: 12,
	publicMaxAge: 60,
	parse: parseAniListProfileQuery,
	run: access => getAniListAnimeCollectionResponse(access)
})

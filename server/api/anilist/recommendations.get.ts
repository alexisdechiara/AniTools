import {
	getAniListRecommendationsResponse,
	parseAniListRecommendationsQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-recommendations",
	limit: 24,
	publicMaxAge: 300,
	parse: parseAniListRecommendationsQuery,
	run: (access, query) => getAniListRecommendationsResponse(access, query)
})

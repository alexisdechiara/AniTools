import {
	getAniListStatisticsResponse,
	parseAniListStatisticsQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-statistics",
	limit: 20,
	publicMaxAge: 300,
	parse: parseAniListStatisticsQuery,
	run: access => getAniListStatisticsResponse(access)
})

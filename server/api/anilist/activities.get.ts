import {
	getAniListActivitiesResponse,
	parseAniListActivitiesQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-activities",
	limit: 30,
	publicMaxAge: 30,
	parse: parseAniListActivitiesQuery,
	run: (access, query) => getAniListActivitiesResponse(access, query)
})

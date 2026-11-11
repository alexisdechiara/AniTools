import {
	getAniListProfileResponse,
	parseAniListProfileQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-profile",
	limit: 30,
	publicMaxAge: 300,
	parse: parseAniListProfileQuery,
	run: access => getAniListProfileResponse(access)
})

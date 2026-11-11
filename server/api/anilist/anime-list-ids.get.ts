import {
	getAniListAnimeListIdsResponse,
	parseAniListProfileQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-anime-list-ids",
	limit: 12,
	publicMaxAge: 300,
	parse: parseAniListProfileQuery,
	run: access => getAniListAnimeListIdsResponse(access)
})

import {
	getAniListAnimeListResponse,
	parseAniListAnimeListQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-anime-list",
	limit: 30,
	publicMaxAge: 60,
	parse: parseAniListAnimeListQuery,
	run: (access, query) => getAniListAnimeListResponse(access, query)
})

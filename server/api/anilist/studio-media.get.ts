import {
	getAniListStudioMediaResponse,
	parseAniListStudioMediaQuery
} from "~~/server/utils/anilist-client"
import { defineAniListRoute } from "~~/server/utils/anilist/route"

export default defineAniListRoute({
	namespace: "anilist-studio-media",
	limit: 24,
	publicMaxAge: 300,
	parse: parseAniListStudioMediaQuery,
	run: (access, query) => getAniListStudioMediaResponse(access, query)
})

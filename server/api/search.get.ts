import {
	forwardAniListRateLimit,
	getAniListSearchResponse
} from "~~/server/utils/anilist-client"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import { parseSearchQuery } from "~~/server/utils/request-validation"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "search",
		limit: 60,
		windowMs: 60_000
	})

	const { q: rawSearch } = parseSearchQuery(getQuery(event))

	if (!rawSearch) {
		return {
			result: {
				predictions: []
			}
		}
	}

	try {
		return await getAniListSearchResponse(rawSearch, {
			timeoutMs: 8_000
		})
	} catch (error) {
		forwardAniListRateLimit(event, error)
		throw error
	}
})

import {
	getAniListSearchResponse,
	handleAniListRouteError
}from "~~/server/utils/anilist-client"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import { parseSearchQuery } from "~~/server/utils/request-validation"

const SUCCESS_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"

export default defineEventHandler(async (event) => {
	enforceRateLimit(event, {
		namespace: "search",
		limit: 60,
		windowMs: 60_000
	})

	const { q: rawSearch } = parseSearchQuery(getQuery(event))

	if (!rawSearch) {
		setResponseHeader(event, "Cache-Control", SUCCESS_CACHE_CONTROL)
		return {
			result: {
				predictions: []
			}
		}
	}

	try {
		const response = await getAniListSearchResponse(rawSearch, {
			timeoutMs: 8_000
		})
		setResponseHeader(event, "Cache-Control", SUCCESS_CACHE_CONTROL)
		return response
	} catch (error) {
		await handleAniListRouteError(event, error)
		throw error
	}
})

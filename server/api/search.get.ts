import type { SearchQuery } from "#gql/default"
import { isError } from "h3"
import { enforceRateLimit } from "~~/server/utils/rate-limit"
import { parseSearchQuery } from "~~/server/utils/request-validation"
import { withTimeout } from "~~/server/utils/with-timeout"

type AniListSearchMedia = NonNullable<NonNullable<NonNullable<SearchQuery["anime"]>["results"]>[number]>

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

	let media: AniListSearchMedia[]
	try {
		const response = await withTimeout<SearchQuery>(
			GqlSearch({
				search: rawSearch,
				isAdult: false
			}),
			8_000,
			"AniList search timed out"
		)
		media = (response.anime?.results ?? []).filter((item: unknown): item is AniListSearchMedia => Boolean(item))
	} catch (error) {
		if (isError(error) && error.statusCode === 504) {
			throw error
		}

		throw createError({
			statusCode: 502,
			statusMessage: "AniList search failed",
			cause: error
		})
	}

	const predictions = media.map((item) => {
		const title = item.title?.english || item.title?.romaji || item.title?.native || `Anime #${item.id}`

		return {
			title,
			id: item.id
		}
	})

	return {
		result: {
			predictions
		}
	}
})

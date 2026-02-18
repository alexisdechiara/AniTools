import type { SearchQuery } from "#gql/default"

type AniListSearchMedia = NonNullable<NonNullable<NonNullable<SearchQuery["anime"]>["results"]>[number]>

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const rawSearch = String(query.q || "").trim()

	if (!rawSearch) {
		return {
			result: {
				predictions: []
			}
		}
	}

	let media: AniListSearchMedia[] = []
	try {
		const response = await GqlSearch({
			search: rawSearch,
			isAdult: false
		})
		media = (response.anime?.results ?? []).filter((item: unknown): item is AniListSearchMedia => Boolean(item))
	} catch (error) {
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

type AniListSearchMedia = {
	id: number
	title?: {
		english?: string | null
		romaji?: string | null
		userPreferred?: string | null
	}
}

const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME) {
      id
      title {
        english
        romaji
        userPreferred
      }
    }
  }
}
`

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

	const runtimeConfig = useRuntimeConfig()
	const gqlHost = runtimeConfig.public.GQL_HOST

	const response = await $fetch<{
		data?: {
			Page?: {
				media?: AniListSearchMedia[]
			}
		}
		errors?: Array<{ message?: string }>
	}>(gqlHost, {
		method: "POST",
		body: {
			query: SEARCH_ANIME_QUERY,
			variables: {
				search: rawSearch,
				page: 1,
				perPage: 10
			}
		}
	})

	if (response.errors?.length) {
		throw createError({
			statusCode: 502,
			statusMessage: response.errors[0]?.message || "AniList search failed"
		})
	}

	const media = response.data?.Page?.media ?? []

	const predictions = media.map((item) => {
		const title = item.title?.english || item.title?.romaji || item.title?.userPreferred || `Anime #${item.id}`

		return {
			id: item.id,
			title,
			structured_main_text: title,
			structured_main_value: item.id
		}
	})

	return {
		result: {
			predictions
		}
	}
})

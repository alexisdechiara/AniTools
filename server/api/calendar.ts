import { createDirectus, readItems, rest } from "@directus/sdk"

type AiringSchedule = Record<string, any>
type SimuldubItem = Record<string, any>

const AIRING_CACHE_TTL_MS = 5 * 60 * 1000
const SIMULDUB_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_RETRIES = 3

const GET_AIRING_ANIMES_QUERY = `
query getAiringAnimes(
  $page: Int,
  $airingAtGreater: Int,
  $airingAtLesser: Int
) {
  Page(page: $page, perPage: 100) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(
      airingAt_greater: $airingAtGreater,
      airingAt_lesser: $airingAtLesser
    ) {
      airingAt
      episode
      media {
        id
        countryOfOrigin
        title {
          romaji
          english
          native
          userPreferred
        }
        nextAiringEpisode {
          airingAt
          episode
        }
        rankings {
          allTime
          context
          season
          type
          year
          rank
        }
        siteUrl
        description
        format
        status
        season
        seasonYear
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        episodes
        duration
        bannerImage
        coverImage {
          medium
          large
          extraLarge
          color
        }
        averageScore
        meanScore
        favourites
        isFavourite
        genres
        tags {
          name
          category
          description
          isAdult
          isGeneralSpoiler
          isMediaSpoiler
        }
        studios(isMain: true) {
          edges {
            isMain
            node {
              name
              siteUrl
            }
          }
        }
        externalLinks {
          site
          url
          language
          color
        }
        trailer {
          id
          site
          thumbnail
        }
        relations {
          edges {
            relationType
            node {
              id
              format
              title {
                english
                romaji
                native
                userPreferred
              }
            }
          }
        }
        studios(isMain: true) {
          edges {
            isMain
            node {
              name
              siteUrl
            }
          }
        }
        mediaListEntry {
          status
          score(format: POINT_100)
          repeat
          progress
          updatedAt
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
        }
      }
    }
  }
}
`

const airingCache = new Map<string, { data: AiringSchedule[], expiresAt: number }>()
const simuldubCache = new Map<string, { data: SimuldubItem[], expiresAt: number }>()
const directus = createDirectus("https://api.anitools.geekly.blog").with(rest())

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchAiringSchedules(airingAtGreater: number, airingAtLesser: number) {
	const cacheKey = `${airingAtGreater}-${airingAtLesser}`
	const cached = airingCache.get(cacheKey)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	const runtimeConfig = useRuntimeConfig()
	const gqlHost = runtimeConfig.public.GQL_HOST
	let allSchedules: AiringSchedule[] = []
	let hasNextPage = true
	let page = 1
	let retryCount = 0

	while (hasNextPage && retryCount < MAX_RETRIES) {
		try {
			const response = await $fetch<{
				data?: {
					Page?: {
						pageInfo?: { hasNextPage?: boolean }
						airingSchedules?: AiringSchedule[]
					}
				}
				errors?: Array<{ message?: string }>
			}>(gqlHost, {
				method: "POST",
				body: {
					query: GET_AIRING_ANIMES_QUERY,
					variables: {
						page,
						airingAtGreater,
						airingAtLesser
					}
				}
			})

			if (response.errors?.length) {
				throw createError({
					statusCode: 502,
					statusMessage: response.errors[0]?.message || "GraphQL request failed"
				})
			}

			const pageData = response.data?.Page
			const schedules = pageData?.airingSchedules ?? []
			allSchedules = [...allSchedules, ...schedules]
			hasNextPage = pageData?.pageInfo?.hasNextPage ?? false
			page++
			retryCount = 0
		} catch (error) {
			retryCount++
			if (retryCount >= MAX_RETRIES) {
				throw error
			}
			await wait(1000 * retryCount)
		}
	}

	airingCache.set(cacheKey, {
		data: allSchedules,
		expiresAt: Date.now() + AIRING_CACHE_TTL_MS
	})

	return allSchedules
}

async function fetchSimuldubs(rangeStart: string, rangeEnd: string) {
	const cacheKey = `${rangeStart}-${rangeEnd}`
	const cached = simuldubCache.get(cacheKey)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data
	}

	const simuldubs = await directus.request(
		readItems("simuldub", {
			filter: {
				status: {
					_or: [{ _eq: "published" }, { _eq: "cancelled" }]
				},
				start_date: {
					_gte: rangeStart,
					_lte: rangeEnd
				}
			}
		})
	)

	simuldubCache.set(cacheKey, {
		data: simuldubs as SimuldubItem[],
		expiresAt: Date.now() + SIMULDUB_CACHE_TTL_MS
	})

	return simuldubs
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const airingAtGreater = Number(query.airingAtGreater)
	const airingAtLesser = Number(query.airingAtLesser)
	const rangeStart = String(query.rangeStart || "")
	const rangeEnd = String(query.rangeEnd || "")

	if (!Number.isFinite(airingAtGreater) || !Number.isFinite(airingAtLesser) || !rangeStart || !rangeEnd) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid query params. Required: airingAtGreater, airingAtLesser, rangeStart, rangeEnd"
		})
	}

	const [airingSchedules, simuldubs] = await Promise.all([
		fetchAiringSchedules(airingAtGreater, airingAtLesser),
		fetchSimuldubs(rangeStart, rangeEnd)
	])

	return {
		airingSchedules,
		simuldubs
	}
})

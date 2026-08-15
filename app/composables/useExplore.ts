import type {
	AniListAnimeListEntry,
	AniListAnimeListIdsResponse,
	AniListAnimeListResponse,
	AniListMediaSummary,
	AniListPageInfo,
	AniListRecommendationsResponse,
	AniListStudioMediaResponse
} from "~~/shared/types/anilist"
import {
	collectExploreStudios,
	selectExploreSeeds
} from "~/utils/explore"

const EMPTY_PAGE_INFO: AniListPageInfo = {
	currentPage: 1,
	hasNextPage: false,
	lastPage: null,
	perPage: 12,
	total: 0
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback
}

export function useExplore() {
	const userStore = useUserStore()
	const entries = ref<AniListAnimeListEntry[]>([])
	const listedMediaIds = ref<Set<number>>(new Set())
	const seeds = computed(() => selectExploreSeeds(entries.value))
	const studios = computed(() => collectExploreStudios(entries.value))
	const existingMediaIds = computed(() => new Set([
		...listedMediaIds.value,
		...entries.value.flatMap(entry => entry.media ? [entry.media.id] : [])
	]))
	const selectedSeedId = ref<number | null>(null)
	const selectedStudioId = ref<number | null>(null)
	const recommendations = ref<AniListMediaSummary[]>([])
	const studioMedia = ref<AniListMediaSummary[]>([])
	const recommendationPageInfo = ref<AniListPageInfo>({ ...EMPTY_PAGE_INFO })
	const studioPageInfo = ref<AniListPageInfo>({ ...EMPTY_PAGE_INFO })
	const loadingList = ref(false)
	const loadingRecommendations = ref(false)
	const loadingStudio = ref(false)
	const listInitialized = ref(false)
	const recommendationsInitialized = ref(false)
	const studioInitialized = ref(false)
	const listError = ref<string | null>(null)
	const recommendationError = ref<string | null>(null)
	const studioError = ref<string | null>(null)
	let recommendationRequest = 0
	let studioRequest = 0

	function mergeMedia(
		current: readonly AniListMediaSummary[],
		incoming: readonly AniListMediaSummary[]
	): AniListMediaSummary[] {
		return [...new Map(
			[...current, ...incoming].map(media => [media.id, media])
		).values()]
	}

	function accessQuery(): Record<string, string> {
		if (userStore.authMode === "public" && userStore.publicUsername) {
			return { username: userStore.publicUsername }
		}

		return {}
	}

	async function loadRecommendations(page = 1) {
		if (!selectedSeedId.value) {
			recommendations.value = []
			recommendationPageInfo.value = { ...EMPTY_PAGE_INFO }
			recommendationsInitialized.value = true
			return
		}

		const requestId = ++recommendationRequest
		loadingRecommendations.value = true
		recommendationError.value = null

		try {
			const response = await $fetch<AniListRecommendationsResponse>(
				"/api/anilist/recommendations",
				{
					query: {
						...accessQuery(),
						mediaId: selectedSeedId.value,
						page,
						perPage: 12
					}
				}
			)
			if (requestId !== recommendationRequest) return
			const nextRecommendations = response.recommendations.map(item => item.media)
			recommendations.value = page > 1
				? mergeMedia(recommendations.value, nextRecommendations)
				: nextRecommendations
			recommendationPageInfo.value = response.pageInfo
		} catch (error) {
			if (requestId !== recommendationRequest) return
			recommendations.value = []
			recommendationError.value = errorMessage(
				error,
				"Unable to load AniList recommendations."
			)
		} finally {
			if (requestId === recommendationRequest) {
				loadingRecommendations.value = false
				recommendationsInitialized.value = true
			}
		}
	}

	async function loadStudio(page = 1) {
		if (!selectedStudioId.value) {
			studioMedia.value = []
			studioPageInfo.value = { ...EMPTY_PAGE_INFO }
			studioInitialized.value = true
			return
		}

		const requestId = ++studioRequest
		loadingStudio.value = true
		studioError.value = null

		try {
			const response = await $fetch<AniListStudioMediaResponse>(
				"/api/anilist/studio-media",
				{
					query: {
						...accessQuery(),
						studioId: selectedStudioId.value,
						page,
						perPage: 12
					}
				}
			)
			if (requestId !== studioRequest) return
			studioMedia.value = page > 1
				? mergeMedia(studioMedia.value, response.media)
				: response.media
			studioPageInfo.value = response.pageInfo
		} catch (error) {
			if (requestId !== studioRequest) return
			studioMedia.value = []
			studioError.value = errorMessage(
				error,
				"Unable to load this studio catalogue."
			)
		} finally {
			if (requestId === studioRequest) {
				loadingStudio.value = false
				studioInitialized.value = true
			}
		}
	}

	async function initialize() {
		loadingList.value = true
		listInitialized.value = false
		recommendationsInitialized.value = false
		studioInitialized.value = false
		listError.value = null

		try {
			const [response, idsResponse] = await Promise.all([
				$fetch<AniListAnimeListResponse>(
					"/api/anilist/anime-list",
					{
						query: {
							...accessQuery(),
							page: 1,
							perPage: 50,
							sort: "score"
						}
					}
				),
				$fetch<AniListAnimeListIdsResponse>(
					"/api/anilist/anime-list-ids",
					{ query: accessQuery() }
				)
			])
			entries.value = response.entries
			listedMediaIds.value = new Set(idsResponse.mediaIds)
			selectedSeedId.value = seeds.value[0]?.media.id ?? null
			selectedStudioId.value = studios.value[0]?.id ?? null
			listInitialized.value = true
			await Promise.all([
				loadRecommendations(),
				loadStudio()
			])
		} catch (error) {
			entries.value = []
			listedMediaIds.value = new Set()
			listError.value = errorMessage(
				error,
				"Unable to load the anime list used for discovery."
			)
		} finally {
			loadingList.value = false
			listInitialized.value = true
		}
	}

	return {
		entries,
		existingMediaIds,
		seeds,
		studios,
		selectedSeedId,
		selectedStudioId,
		recommendations,
		studioMedia,
		recommendationPageInfo,
		studioPageInfo,
		loadingList,
		loadingRecommendations,
		loadingStudio,
		listInitialized,
		recommendationsInitialized,
		studioInitialized,
		listError,
		recommendationError,
		studioError,
		initialize,
		loadRecommendations,
		loadStudio
	}
}

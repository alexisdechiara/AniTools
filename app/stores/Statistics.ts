import { defineStore } from "pinia"
import type {
	AniListSource,
	AniListStatistics,
	AniListStatisticsResponse
} from "~~/shared/types/anilist"
import {
	selectBestScoreAnime,
	selectLongestWatchAnime,
	selectMostRewatchedAnime,
	sortStatistics
} from "~/utils/statistics"
import type { StatisticMetric as MetricSort } from "~/utils/statistics"

export type { StatisticMetric as MetricSort } from "~/utils/statistics"

export const useStatisticsStore = defineStore("Statistics", () => {
	// Resolved once while the store is created: on the server, useRequestFetch() needs the
	// Nuxt context, which is gone after the first await inside an action.
	const requestFetch = import.meta.server ? useRequestFetch() : $fetch

	const user = useUserStore()
	const { getAllAnimes: animes } = storeToRefs(useEntriesStore())
	const statistics = ref<AniListStatistics | null>(null)
	const source = ref<AniListSource | null>(null)
	const genresSort = ref<MetricSort>("count")
	const tagsSort = ref<MetricSort>("count")
	const formatsSort = ref<MetricSort>("count")
	const countriesSort = ref<MetricSort>("count")
	const statusSort = ref<MetricSort>("count")
	const studiosSort = ref<MetricSort>("count")
	const isInitialized = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const loadedIdentity = ref<string | null>(null)
	const stale = ref(false)
	let pendingRequest: Promise<boolean> | null = null
	let pendingIdentity: string | null = null
	// Bumped by $reset() and by a request for another identity: a request only writes
	// the state while the generation it started with is still the current one.
	let generation = 0

	const identity = computed(() => {
		if (!user.isAuthenticated || !user.getUsername) return null
		return `${user.authMode ?? "anonymous"}:${user.getUsername}`
	})

	// A different identity must never see the previous one's statistics, even before a refetch.
	// Synchronous so the reset always lands before a caller can start the next identity's request.
	watch(identity, (nextIdentity) => {
		if (loadedIdentity.value !== null && loadedIdentity.value !== nextIdentity) {
			$reset()
		}
	}, { flush: "sync" })

	const meanScore = computed(() => statistics.value?.meanScore)
	const minutesWatched = computed(() => statistics.value?.minutesWatched)
	const episodesWatched = computed(() => statistics.value?.episodesWatched)
	const count = computed(() => statistics.value?.count)
	const statuses = computed(() => statistics.value?.statuses)
	const scores = computed(() => statistics.value?.scores)
	const startYears = computed(() => statistics.value?.startYears)
	const releaseYears = computed(() => statistics.value?.releaseYears)
	const genres = computed(() => statistics.value?.genres)
	const tags = computed(() => statistics.value?.tags)
	const countries = computed(() => statistics.value?.countries)
	const studios = computed(() => statistics.value?.studios)
	const voiceActors = computed(() => statistics.value?.voiceActors)
	const staff = computed(() => statistics.value?.staff)
	const formats = computed(() => statistics.value?.formats)
	const lengths = computed(() => statistics.value?.lengths)

	async function fetchStatistics(force = false): Promise<boolean> {
		const currentIdentity = identity.value
		if (!currentIdentity) {
			$reset()
			return false
		}
		if (!force && !stale.value && isInitialized.value && loadedIdentity.value === currentIdentity) {
			return true
		}
		if (pendingRequest && pendingIdentity === currentIdentity) return pendingRequest
		if (pendingRequest) {
			// The running request belongs to another identity: it may no longer write.
			generation += 1
		}

		const requestGeneration = generation
		pendingIdentity = currentIdentity
		pendingRequest = (async () => {
			loading.value = true
			error.value = null
			if (loadedIdentity.value !== currentIdentity) {
				statistics.value = null
				isInitialized.value = false
			}

			try {
				const fetcher = requestFetch
				const username = user.authMode === "public" ? user.getUsername : undefined
				const response = await fetcher<AniListStatisticsResponse>("/api/anilist/statistics", {
					query: username ? { username } : undefined
				})

				// A superseded or reset request reports success without writing anything.
				if (requestGeneration !== generation) return true

				statistics.value = response.statistics
				source.value = response.source
				loadedIdentity.value = currentIdentity
				isInitialized.value = true
				stale.value = false
				return true
			} catch (caughtError) {
				if (requestGeneration !== generation) return false

				statistics.value = null
				source.value = null
				loadedIdentity.value = currentIdentity
				isInitialized.value = false
				error.value = getApiErrorMessage(caughtError, "Unable to load AniList statistics.")
				return false
			} finally {
				if (requestGeneration === generation) {
					loading.value = false
					pendingRequest = null
					pendingIdentity = null
				}
			}
		})()

		return pendingRequest
	}

	function invalidate() {
		stale.value = true
	}

	function getSortedGenres(sort: MetricSort = genresSort.value, limit = 5) {
		return sortStatistics(genres.value, sort, limit)
	}

	function getSortedTags(sort: MetricSort = tagsSort.value, limit = 5) {
		return sortStatistics(tags.value, sort, limit)
	}

	function getSortedFormats(sort: MetricSort = formatsSort.value, limit = 6) {
		return sortStatistics(formats.value, sort, limit)
	}

	function getSortedCountries(sort: MetricSort = countriesSort.value, limit = 4) {
		return sortStatistics(countries.value, sort, limit)
	}

	function getSortedStatus(sort: MetricSort = statusSort.value, limit = 5) {
		return sortStatistics(statuses.value, sort, limit)
	}

	function getSortedStudios(sort: MetricSort = studiosSort.value, limit = 5) {
		return sortStatistics(studios.value, sort, limit)
	}

	const getBestScoreAnime = computed(() => selectBestScoreAnime(animes.value))
	const getLongestAnime = computed(() => selectLongestWatchAnime(animes.value))
	const getMostWatchedAnime = computed(() => selectMostRewatchedAnime(animes.value))

	function $reset() {
		statistics.value = null
		source.value = null
		genresSort.value = "count"
		tagsSort.value = "count"
		formatsSort.value = "count"
		countriesSort.value = "count"
		statusSort.value = "count"
		studiosSort.value = "count"
		isInitialized.value = false
		loading.value = false
		error.value = null
		loadedIdentity.value = null
		stale.value = false
		pendingRequest = null
		pendingIdentity = null
		generation += 1
	}

	return {
		statistics,
		source,
		meanScore,
		minutesWatched,
		episodesWatched,
		count,
		statuses,
		scores,
		startYears,
		releaseYears,
		genres,
		tags,
		countries,
		studios,
		voiceActors,
		staff,
		formats,
		lengths,
		genresSort,
		tagsSort,
		formatsSort,
		countriesSort,
		statusSort,
		studiosSort,
		fetchStatistics,
		invalidate,
		getSortedGenres,
		getSortedTags,
		getSortedFormats,
		getSortedCountries,
		getSortedStatus,
		getBestScoreAnime,
		getLongestAnime,
		getMostWatchedAnime,
		getSortedStudios,
		loading,
		error,
		isInitialized,
		$reset
	}
})

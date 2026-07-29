import { defineStore } from "pinia"
import type { UserStatisticsQuery } from "#gql/default"
import {
	selectBestScoreAnime,
	selectLongestWatchAnime,
	selectMostRewatchedAnime,
	sortStatistics
} from "~/utils/statistics"
import type { StatisticMetric as MetricSort } from "~/utils/statistics"

type statistics = NonNullable<NonNullable<NonNullable<UserStatisticsQuery["User"]>["statistics"]>["anime"]>

export type { StatisticMetric as MetricSort } from "~/utils/statistics"

export const useStatisticsStore = defineStore("Statistics", () => {
	const { getAllAnimes: animes } = storeToRefs(useEntriesStore())

	const meanScore = ref<statistics["meanScore"]>()
	const minutesWatched = ref<statistics["minutesWatched"]>()
	const episodesWatched = ref<statistics["episodesWatched"]>()
	const count = ref<statistics["count"]>()
	const statuses = ref<statistics["statuses"]>()
	const scores = ref<statistics["scores"]>()
	const startYears = ref<statistics["startYears"]>()
	const releaseYears = ref<statistics["releaseYears"]>()
	const genres = ref<statistics["genres"]>()
	const tags = ref<statistics["tags"]>()
	const countries = ref<statistics["countries"]>()
	const studios = ref<statistics["studios"]>()
	const formats = ref<statistics["formats"]>()
	const lengths = ref<statistics["lengths"]>()
	const genresSort = ref<MetricSort>("count")
	const tagsSort = ref<MetricSort>("count")
	const formatsSort = ref<MetricSort>("count")
	const countriesSort = ref<MetricSort>("count")
	const statusSort = ref<MetricSort>("count")
	const studiosSort = ref<MetricSort>("count")

	const isInitialized = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)

	async function fetchStatistics(userId: number): Promise<boolean> {
		if (!userId) return false
		loading.value = true
		error.value = null

		try {
			const { data } = await useAsyncGql({
				operation: "userStatistics",
				variables: { userId }
			})

			const animeStats = data.value?.User?.statistics?.anime
			if (!animeStats) return false
			isInitialized.value = true
			meanScore.value = animeStats.meanScore
			minutesWatched.value = animeStats.minutesWatched
			episodesWatched.value = animeStats.episodesWatched
			count.value = animeStats.count
			statuses.value = animeStats.statuses
			scores.value = animeStats.scores
			startYears.value = animeStats.startYears
			releaseYears.value = animeStats.releaseYears
			genres.value = animeStats.genres
			tags.value = animeStats.tags
			countries.value = animeStats.countries
			studios.value = animeStats.studios
			formats.value = animeStats.formats
			lengths.value = animeStats.lengths
			return true
		} catch (err) {
			console.error("Error fetching statistics:", err)
			error.value = "Une erreur est survenue lors du chargement des statistiques."
			return false
		} finally {
			loading.value = false
		}
	}

	function getSortedGenres(sort: MetricSort = genresSort.value, limit: number = 5) {
		return sortStatistics(genres.value, sort, limit)
	}

	function getSortedTags(sort: MetricSort = tagsSort.value, limit: number = 5) {
		return sortStatistics(tags.value, sort, limit)
	}

	function getSortedFormats(sort: MetricSort = formatsSort.value, limit: number = 6) {
		return sortStatistics(formats.value, sort, limit)
	}

	function getSortedCountries(sort: MetricSort = countriesSort.value, limit: number = 4) {
		return sortStatistics(countries.value, sort, limit)
	}

	function getSortedStatus(sort: MetricSort = statusSort.value, limit: number = 5) {
		return sortStatistics(statuses.value, sort, limit)
	}

	function getSortedStudios(sort: MetricSort = studiosSort.value, limit: number = 5) {
		return sortStatistics(studios.value, sort, limit)
	}

	const getBestScoreAnime = computed(() => {
		return selectBestScoreAnime(animes.value)
	})

	const getLongestAnime = computed(() => {
		return selectLongestWatchAnime(animes.value)
	})

	const getMostWatchedAnime = computed(() => {
		return selectMostRewatchedAnime(animes.value)
	})

	function $reset() {
		meanScore.value = undefined
		minutesWatched.value = undefined
		episodesWatched.value = undefined
		count.value = undefined
		statuses.value = undefined
		scores.value = undefined
		startYears.value = undefined
		releaseYears.value = undefined
		genres.value = undefined
		tags.value = undefined
		countries.value = undefined
		studios.value = undefined
		formats.value = undefined
		lengths.value = undefined
		genresSort.value = "count"
		tagsSort.value = "count"
		formatsSort.value = "count"
		countriesSort.value = "count"
		statusSort.value = "count"
		studiosSort.value = "count"

		isInitialized.value = false
		loading.value = false
		error.value = null
	}

	return {
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
		formats,
		lengths,
		genresSort,
		tagsSort,
		formatsSort,
		countriesSort,
		statusSort,
		studiosSort,
		fetchStatistics,
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

import { defineStore } from "pinia"
import type { UserStatisticsQuery } from "#gql/default"

type statistics = NonNullable<NonNullable<NonNullable<UserStatisticsQuery["User"]>["statistics"]>["anime"]>

export type MetricSort = "count" | "meanScore" | "minutesWatched"

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
		if (!genres.value) return []
		let sortedGenres: statistics["genres"] = []
		switch (sort) {
			case "count":
				sortedGenres = genres.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sortedGenres = genres.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sortedGenres = genres.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sortedGenres = genres.value
				break
		}
		if (sortedGenres.length > limit)
			return sortedGenres.slice(0, limit)
		return sortedGenres
	}

	function getSortedTags(sort: MetricSort, limit: number = 5) {
		if (!tags.value) return []
		let sortedTags: statistics["tags"] = []
		switch (sort) {
			case "count":
				sortedTags = tags.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sortedTags = tags.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sortedTags = tags.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sortedTags = tags.value
				break
		}
		if (sortedTags.length > limit)
			return sortedTags.slice(0, limit)
		return sortedTags
	}

	function getSortedFormats(sort: MetricSort = formatsSort.value, limit: number = 6) {
		if (!formats.value) return []
		let sorted = formats.value
		switch (sort) {
			case "count":
				sorted = formats.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sorted = formats.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sorted = formats.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sorted = formats.value
		}
		if (sorted.length > limit)
			return sorted.slice(0, limit)
		return sorted
	}

	function getSortedCountries(sort: MetricSort = countriesSort.value, limit: number = 4) {
		if (!countries.value) return []
		let sorted = countries.value
		switch (sort) {
			case "count":
				sorted = countries.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sorted = countries.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sorted = countries.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sorted = countries.value
		}
		if (sorted.length > limit)
			return sorted.slice(0, limit)
		return sorted
	}

	function getSortedStatus(sort: MetricSort = statusSort.value, limit: number = 5) {
		if (!statuses.value) return []
		let sorted = statuses.value
		switch (sort) {
			case "count":
				sorted = statuses.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sorted = statuses.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sorted = statuses.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sorted = statuses.value
		}
		if (sorted.length > limit)
			return sorted.slice(0, limit)
		return sorted
	}

	function getSortedStudios(sort: MetricSort = studiosSort.value, limit: number = 5) {
		if (!studios.value) return []
		let sortedStudios: statistics["studios"] = []
		switch (sort) {
			case "count":
				sortedStudios = studios.value.sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0))
				break
			case "meanScore":
				sortedStudios = studios.value.sort((a, b) => (b?.meanScore ?? 0) - (a?.meanScore ?? 0))
				break
			case "minutesWatched":
				sortedStudios = studios.value.sort((a, b) => (b?.minutesWatched ?? 0) - (a?.minutesWatched ?? 0))
				break
			default:
				sortedStudios = studios.value
				break
		}
		if (sortedStudios.length > limit)
			return sortedStudios.slice(0, limit)
		return sortedStudios
	}

	// TODO : donner la licences au lieu de la saison
	const getBestScoreAnime = computed(() => {
		try {
			if (!animes.value || animes.value.length === 0) return null

			// Filtrer les entrées sans média ou sans score valide
			const validAnimes = animes.value.filter(anime =>
				anime?.media
				&& (anime.score !== null && anime.score !== undefined)
			)

			if (validAnimes.length === 0) return null

			// Trier d'abord par score décroissant, puis par isFavourite, puis par meanScore
			const sortedAnimes = [...validAnimes].sort((a, b) => {
				// S'assurer que les scores sont des nombres
				const scoreA = Number(a?.score) || 0
				const scoreB = Number(b?.score) || 0

				// Comparaison des scores
				const scoreDiff = scoreB - scoreA
				if (scoreDiff !== 0) return scoreDiff

				// En cas d'égalité, vérifier si l'un est favori et pas l'autre
				const isFavA = a?.media?.isFavourite ? 1 : 0
				const isFavB = b?.media?.isFavourite ? 1 : 0
				const favDiff = isFavB - isFavA
				if (favDiff !== 0) return favDiff

				// Si toujours égalité, comparer les averageScore
				const meanScoreA = Number(a?.media?.averageScore) || 0
				const meanScoreB = Number(b?.media?.averageScore) || 0
				return meanScoreB - meanScoreA
			})

			return sortedAnimes[0] || null
		} catch (error) {
			console.error("Error in getBestScoreAnime:", error)
			return null
		}
	})

	const getLongestAnime = computed(() => {
		try {
			if (!animes.value || animes.value.length === 0) return null

			// Filtrer les entrées avec un progrès valide
			const validAnimes = animes.value.filter(anime =>
				!!anime?.media
				&& (anime.progress !== null && anime.progress !== undefined && anime.progress > 0)
			)

			if (validAnimes.length === 0) return null

			// Trier par progress décroissant
			const sortedAnimes = [...validAnimes].sort((a, b) =>
				(b?.progress ?? 0) - (a?.progress ?? 0)
			)

			return sortedAnimes[0] || null
		} catch (error) {
			console.error("Error in getLongestAnime:", error)
			return null
		}
	})

	const getMostWatchedAnime = computed(() => {
		try {
			if (!animes.value || animes.value.length === 0) return null

			// Filtrer les entrées avec un nombre de répétitions valide
			const validAnimes = animes.value.filter(anime =>
				!!anime?.media
				&& (anime.repeat !== null && anime.repeat !== undefined && anime.repeat > 0)
			)

			if (validAnimes.length === 0) return null

			// Trier par nombre de répétitions décroissant
			const sortedAnimes = [...validAnimes].sort((a, b) =>
				(b?.repeat ?? 0) - (a?.repeat ?? 0)
			)

			return sortedAnimes[0] || null
		} catch (error) {
			console.error("Error in getMostWatchedAnime:", error)
			return null
		}
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

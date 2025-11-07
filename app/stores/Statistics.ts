import { defineStore } from "pinia"
import type { UserStatisticsQuery } from "#gql/default"

type statistics = NonNullable<NonNullable<NonNullable<UserStatisticsQuery["User"]>["statistics"]>["anime"]>

export const useStatisticsStore = defineStore("Statistics", () => {
	const entriesStore = useEntriesStore()

	const isInitialized = ref(false)
	const meanScore = ref<statistics["meanScore"]>()
	const minutesWatched = ref<statistics["minutesWatched"]>()
	const episodesWatched = ref<statistics["episodesWatched"]>()
	const count = ref<statistics["count"]>()
	const statuses = ref<statistics["statuses"]>()
	const scores = ref<statistics["scores"]>()
	const startYears = ref<statistics["startYears"]>()
	const genres = ref<statistics["genres"]>()
	const tags = ref<statistics["tags"]>()

	const genresSort = ref<"count" | "meanScore" | "minutesWatched">("count")
	const tagsSort = ref<"count" | "meanScore" | "minutesWatched">("count")

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
			genres.value = animeStats.genres
			tags.value = animeStats.tags
			return true
		} catch (err) {
			console.error("Error fetching statistics:", err)
			error.value = "Une erreur est survenue lors du chargement des statistiques."
			return false
		} finally {
			loading.value = false
		}
	}

	function getSortedGenres(sort: "count" | "meanScore" | "minutesWatched" = genresSort.value, limit: number = 5) {
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

	function getSortedTags(sort: "count" | "meanScore" | "minutesWatched", limit: number = 5) {
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

	// TODO corriger le problème de favoris
	const getBestScoreAnime = computed(() => {
		try {
			const animes = entriesStore.getAllAnimes()

			if (!animes || animes.length === 0) return null

			// Filtrer les entrées sans média ou sans score valide
			const validAnimes = animes.filter(anime =>
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

				// Si toujours égalité, comparer les meanScore
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
			const animes = entriesStore.getAllAnimes()

			if (!animes || animes.length === 0) return null

			// Filtrer les entrées avec un progrès valide
			const validAnimes = animes.filter(anime =>
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
			const animes = entriesStore.getAllAnimes()

			if (!animes || animes.length === 0) return null

			// Filtrer les entrées avec un nombre de répétitions valide
			const validAnimes = animes.filter(anime =>
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

	return {
		meanScore,
		minutesWatched,
		episodesWatched,
		count,
		statuses,
		scores,
		startYears,
		genres,
		tags,
		genresSort,
		tagsSort,
		fetchStatistics,
		getSortedGenres,
		getSortedTags,
		getBestScoreAnime,
		getLongestAnime,
		getMostWatchedAnime,
		loading,
		error,
		isInitialized
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage()
	}
})

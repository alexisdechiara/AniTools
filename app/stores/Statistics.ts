import { defineStore } from "pinia"
import { UserStatisticsSort, type StatisticsQueryQuery } from "#gql/default"

type UserStatistics = NonNullable<NonNullable<StatisticsQueryQuery["User"]>["statistics"]>
type AnimeStatistics = NonNullable<UserStatistics["anime"]>

export const useStatisticsStore = defineStore("Statistics", () => {
	const { id: userId } = storeToRefs(useUserStore())

	const anime = ref<AnimeStatistics | null>(null)

	const genresSort = ref<UserStatisticsSort[]>([UserStatisticsSort.COUNT_DESC])
	const tagsSort = ref<UserStatisticsSort[]>([UserStatisticsSort.COUNT_DESC])
	const loading = ref(false)
	const error = ref<string | null>(null)

	const hasStatistics = computed(() => !!anime.value)
	const totalWatchTime = computed(() => anime.value?.minutesWatched ?? 0)
	const totalEpisodesWatched = computed(() => anime.value?.episodesWatched ?? 0)
	const meanScore = computed(() => anime.value?.meanScore ?? 0)
	const totalAnimeCount = computed(() => anime.value?.count ?? 0)

	async function fetchStatistics(userId: number, limit = 5): Promise<boolean> {
		if (!userId) return false
		loading.value = true
		error.value = null

		try {
			const { data } = await useAsyncGql({
				operation: "statisticsQuery",
				variables: { userId, limit }
			})

			const animeStats = data.value?.User?.statistics?.anime
			if (!animeStats) return false
			anime.value = animeStats
			return true
		} catch (err) {
			console.error("Error fetching statistics:", err)
			error.value = "Une erreur est survenue lors du chargement des statistiques."
			return false
		} finally {
			loading.value = false
		}
	}

	async function fetchGenres(userId: number, limit = 5, sort: UserStatisticsSort[] = genresSort.value) {
		if (!userId) return false

		try {
			const { data } = await useAsyncGql({
				operation: "getGenresStatistics",
				variables: { userId, limit, sort }
			})

			const genres = data.value?.User?.statistics?.anime?.genres ?? []
			if (!genres.length) return false

			anime.value!.genres = genres

			return true
		} catch (err) {
			console.error("Error fetching genres:", err)
			error.value = "Une erreur est survenue lors du chargement des genres."
			return false
		} finally {
			loading.value = false
		}
	}

	function $reset() {
		anime.value = null
		error.value = null
		loading.value = false
		genresSort.value = [UserStatisticsSort.COUNT_DESC]
		tagsSort.value = [UserStatisticsSort.COUNT_DESC]
	}

	async function fetchTags(userId: number, limit = 5, sort: UserStatisticsSort[] = tagsSort.value) {
		if (!userId) return false

		try {
			const { data } = await useAsyncGql({
				operation: "getTagsStatistics",
				variables: { userId, limit, sort }
			})

			const tags = data.value?.User?.statistics?.anime?.tags ?? []
			if (!tags.length) return false

			anime.value!.tags = tags

			return true
		} catch (err) {
			console.error("Error fetching tags:", err)
			error.value = "Une erreur est survenue lors du chargement des tags."
			return false
		}
	}

	watch(genresSort, () => {
		if (userId?.value) {
			fetchGenres(userId.value)
		}
	})

	watch(tagsSort, () => {
		if (userId?.value) {
			fetchTags(userId.value)
		}
	})

	return {
		anime: anime,
		loading: loading,
		error: error,
		genresSort,
		tagsSort,
		hasStatistics,
		totalWatchTime,
		totalEpisodesWatched,
		meanScore,
		totalAnimeCount,
		fetchStatistics,
		$reset
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage()
	}
})

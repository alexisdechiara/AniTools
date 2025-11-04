import { defineStore } from "pinia"
import type { StatisticsQueryQuery } from "#gql/default"

type UserStatistics = NonNullable<NonNullable<StatisticsQueryQuery["User"]>["statistics"]>
type AnimeStatistics = NonNullable<UserStatistics["anime"]>

export const useStatisticsStore = defineStore("statistics", () => {
	// State
	const anime = ref<AnimeStatistics | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	// Getters
	const hasStatistics = computed(() => !!anime.value)
	const totalWatchTime = computed(() => anime.value?.minutesWatched ?? 0)
	const totalEpisodesWatched = computed(() => anime.value?.episodesWatched ?? 0)
	const meanScore = computed(() => anime.value?.meanScore ?? 0)
	const totalAnimeCount = computed(() => anime.value?.count ?? 0)

	// Actions
	async function fetchStatistics(userId: number, limit = 5): Promise<boolean> {
		if (!userId) return false

		loading.value = true
		error.value = null

		try {
			const { data } = await useAsyncGql({
				operation: "statisticsQuery",
				variables: { userId, limit }
			})

			if (data?.value?.User?.statistics?.anime) {
				anime.value = data.value.User.statistics.anime
				return true
			}

			return false
		} catch (err) {
			console.error("Error fetching statistics:", err)
			error.value = "Failed to fetch statistics. Please try again later."
			return false
		} finally {
			loading.value = false
		}
	}

	function $reset() {
		anime.value = null
		error.value = null
		loading.value = false
	}

	return {
		// State
		anime: readonly(anime),
		loading: readonly(loading),
		error: readonly(error),

		// Getters
		hasStatistics,
		totalWatchTime,
		totalEpisodesWatched,
		meanScore,
		totalAnimeCount,

		// Actions
		fetchStatistics,
		$reset
	}
}, {
	persist: true
})

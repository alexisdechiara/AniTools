import { defineStore } from "pinia"
import type { StatisticsQueryQuery } from "#gql/default"

type UserStatistics = NonNullable<NonNullable<StatisticsQueryQuery["User"]>["statistics"]>
type AnimeStatistics = NonNullable<UserStatistics["anime"]>

export interface GenreWithMedia {
	genre: string | null | undefined
	meanScore: number | undefined
	minutesWatched: number | undefined
	count: number | undefined
	mediaId: number | null | undefined
	media: Record<string, unknown> | undefined
}

export const useStatisticsStore = defineStore("Statistics", () => {
	const anime = ref<AnimeStatistics | null>(null)

	const genresWithMedia = ref<GenreWithMedia[]>([])
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

			const genres = animeStats.genres ?? []
			const firstMediaIds = genres
				.map(g => g?.mediaIds?.[0])
				.filter((id): id is number => typeof id === "number" && !isNaN(id))

			if (firstMediaIds.length > 0) {
				const { data: mediaData } = await useAsyncGql({
					operation: "getMediasByGenre",
					variables: { ids: firstMediaIds }
				})

				const mediaList = mediaData.value?.Page?.media ?? []
				const mediaById = Object.fromEntries(mediaList.map((m: any) => [m.id, m]))

				genresWithMedia.value = genres.map(genre => ({
					genre: genre?.genre,
					meanScore: genre?.meanScore,
					minutesWatched: genre?.minutesWatched,
					count: genre?.count,
					mediaId: genre?.mediaIds?.[0],
					media: genre?.mediaIds?.[0] ? mediaById[genre?.mediaIds?.[0]] : undefined
				}))
			} else {
				genresWithMedia.value = []
			}

			return true
		} catch (err) {
			console.error("Error fetching statistics:", err)
			error.value = "Une erreur est survenue lors du chargement des statistiques."
			return false
		} finally {
			loading.value = false
		}
	}

	function $reset() {
		anime.value = null
		genresWithMedia.value = []
		error.value = null
		loading.value = false
	}

	return {
		anime: anime,
		genresWithMedia: genresWithMedia,
		loading: loading,
		error: error,
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

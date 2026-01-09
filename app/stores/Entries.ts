import { ScoreFormat, MediaType } from "#gql/default"
import { defineStore } from "pinia"
import type { GetAllEntriesQuery } from "#gql/default"

export type AnimesType = NonNullable<GetAllEntriesQuery["MediaListCollection"]>["lists"]

export const useEntriesStore = defineStore("Entries", () => {
	const user = useUserStore()
	const lists = ref<AnimesType>([])
	const isInitialized = ref(false)

	function fetchAllAnimes(userId?: number, format?: ScoreFormat): Promise<typeof lists.value> {
		console.log("fetchAllAnimes called with:", { userId: userId || user.getId, format })
		console.log("User store ID:", user.getId)

		return new Promise((resolve) => {
			useAsyncGql({
				operation: "getAllEntries",
				variables: {
					userId: userId || user.getId,
					type: MediaType.ANIME,
					format: ScoreFormat.POINT_100
				}
			})
				.then(({ data }) => {
					console.log("GQL response:", data.value)

					if (data.value?.MediaListCollection?.lists) {
						console.log("Found lists:", data.value.MediaListCollection.lists.length)
						lists.value = data.value.MediaListCollection.lists
					} else {
						console.warn("Aucun anime trouvé pour cet utilisateur")
						lists.value = []
					}
					isInitialized.value = true
					resolve(lists.value)
				})
				.catch((error) => {
					console.error("Erreur lors de la récupération des lists:", error)
					lists.value = []
					resolve(lists.value)
				})
		})
	}

	const getNextAiringAnimesEpisodes = computed(() => {
		if (!lists.value) return []
		return lists.value?.flatMap(list => list?.entries || []).filter(entry => entry?.media?.nextAiringEpisode && entry?.media?.nextAiringEpisode?.airingAt)
	})

	const getAllAnimes = computed(() => {
		if (!lists.value) return []
		return lists.value.flatMap(list => list?.entries || []).sort((a, b) => (b?.score || 0) - (a?.score || 0))
	})

	function getAnimesByStatus(status: string[], limit?: number) {
		return lists.value?.filter(list => status.includes(list!.status!))?.flatMap(list => list?.entries || []).slice(0, limit) ?? []
	}

	function getAnimesByGenres(genres: string[], limit?: number) {
		return getAllAnimes.value
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.genres?.some(genre => genres.includes(genre ?? "")))
			})
			.slice(0, limit)
	}

	function getAnimeByTags(tags: string[], limit?: number) {
		return getAllAnimes.value
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.tags?.some(tag => tags.includes(tag?.name ?? "")))
			})
			.slice(0, limit)
	}

	function getAnimesByMediaIds(ids: number[], limit?: number) {
		return getAllAnimes.value
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.id && ids.includes(entry.media.id))
			})
			.slice(0, limit)
	}

	function $reset() {
		lists.value = []
	}

	return {
		lists,
		isInitialized,
		fetchAllAnimes,
		getAllAnimes,
		getNextAiringAnimesEpisodes,
		getAnimesByStatus,
		getAnimesByGenres,
		getAnimeByTags,
		getAnimesByMediaIds,
		$reset
	}
})

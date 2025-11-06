import { ScoreFormat, MediaType } from "#gql/default"
import { defineStore } from "pinia"
import type { GetAllEntriesQuery } from "#gql/default"

export type AnimesType = NonNullable<GetAllEntriesQuery["MediaListCollection"]>["lists"]

export const useEntriesStore = defineStore("Entries", () => {
	const user = useUserStore()
	let lists: AnimesType = []

	function fetchAllAnimes(userId?: number, format?: ScoreFormat): Promise<typeof lists> {
		return new Promise((resolve) => {
			useAsyncGql({
				operation: "getAllEntries",
				variables: {
					userId: userId || user.getId,
					type: MediaType.ANIME,
					format: format || user.getMediaListOptions.scoreFormat || ScoreFormat.POINT_100
				}
			})
				.then(({ data }) => {
					if (data.value?.MediaListCollection?.lists) {
						lists = data.value.MediaListCollection.lists
					} else {
						console.warn("Aucun anime trouvé pour cet utilisateur")
						lists = []
					}
					resolve(lists)
				})
				.catch((error) => {
					console.error("Erreur lors de la récupération des lists:", error)
					lists = []
					resolve(lists)
				})
		})
	}

	function getAllAnimes() {
		if (!lists) return []
		return lists.flatMap(list => list?.entries || []).sort((a, b) => (b?.score || 0) - (a?.score || 0))
	}

	function getAnimesByStatus(status: string[], limit?: number) {
		return lists?.filter(list => status.includes(list!.status!))?.flatMap(list => list?.entries || []).slice(0, limit) ?? []
	}

	function getAnimesByGenres(genres: string[], limit?: number) {
		return getAllAnimes()
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.genres?.some(genre => genres.includes(genre ?? "")))
			})
			.slice(0, limit)
	}

	function getAnimeByTags(tags: string[], limit?: number) {
		return getAllAnimes()
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.tags?.some(tag => tags.includes(tag?.name ?? "")))
			})
			.slice(0, limit)
	}

	function getAnimesByMediaIds(ids: number[], limit?: number) {
		return getAllAnimes()
			.filter((entry): entry is NonNullable<typeof entry> => {
				return Boolean(entry?.media?.id && ids.includes(entry.media.id))
			})
			.slice(0, limit)
	}

	return {
		lists,
		fetchAllAnimes,
		getAllAnimes,
		getAnimesByStatus,
		getAnimesByGenres,
		getAnimeByTags,
		getAnimesByMediaIds
	}
}, {
	persist: {
		storage: piniaPluginPersistedstate.localStorage()
	}
})

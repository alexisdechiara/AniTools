import { defineStore } from "pinia"
import type {
	AniListAnimeListEntry,
	AniListAnimeListResponse,
	AniListSource
} from "~~/shared/types/anilist"
import {
	collectAniListAnimeEntries,
	groupAnimeEntries,
	sortAnimeEntriesByScore,
	type AnimeListGroup
} from "~/utils/anilist-list"

export type AnimeListEntry = AniListAnimeListEntry

export type AnimesType = AnimeListGroup[]

function take<T>(items: T[], limit?: number): T[] {
	return limit === undefined ? items : items.slice(0, Math.max(0, limit))
}

export const useEntriesStore = defineStore("Entries", () => {
	const user = useUserStore()
	const entries = ref<AnimeListEntry[]>([])
	const source = ref<AniListSource | null>(null)
	const isInitialized = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const loadedIdentity = ref<string | null>(null)
	let pendingRequest: Promise<AnimeListEntry[]> | null = null

	const identity = computed(() => {
		if (!user.isAuthenticated || !user.getUsername) return null
		return `${user.authMode ?? "anonymous"}:${user.getUsername}`
	})

	const lists = computed<AnimeListGroup[]>(() => groupAnimeEntries(entries.value))

	async function fetchAllAnimes(force = false): Promise<AnimeListEntry[]> {
		const currentIdentity = identity.value
		if (!currentIdentity) {
			$reset()
			return []
		}
		if (!force && isInitialized.value && loadedIdentity.value === currentIdentity) {
			return entries.value
		}
		if (pendingRequest) return pendingRequest

		pendingRequest = (async () => {
			loading.value = true
			error.value = null
			if (loadedIdentity.value !== currentIdentity) {
				entries.value = []
				isInitialized.value = false
			}

			try {
				const fetcher = import.meta.server ? useRequestFetch() : $fetch
				const username = user.authMode === "public" ? user.getUsername : undefined
				const collected = await collectAniListAnimeEntries(page =>
					fetcher<AniListAnimeListResponse>("/api/anilist/anime-list", {
						query: {
							...(username ? { username } : {}),
							page,
							perPage: 50,
							sort: "score"
						}
					})
				)

				source.value = collected.source
				entries.value = collected.entries
				loadedIdentity.value = currentIdentity
				isInitialized.value = true
				return entries.value
			} catch (caughtError) {
				entries.value = []
				source.value = null
				loadedIdentity.value = currentIdentity
				isInitialized.value = false
				error.value = caughtError instanceof Error
					? caughtError.message
					: "Unable to load the AniList anime list."
				throw caughtError
			} finally {
				loading.value = false
				pendingRequest = null
			}
		})()

		return pendingRequest
	}

	const getNextAiringAnimesEpisodes = computed(() =>
		entries.value
			.filter(entry => entry.media?.nextAiringEpisode?.airingAt)
			.toSorted((left, right) =>
				(left.media?.nextAiringEpisode?.airingAt ?? 0)
				- (right.media?.nextAiringEpisode?.airingAt ?? 0)
			)
	)

	const getAllAnimes = computed(() => sortAnimeEntriesByScore(entries.value))

	function getAnimesByStatus(statuses: string[], limit?: number) {
		return take(
			getAllAnimes.value.filter(entry => entry.status && statuses.includes(entry.status)),
			limit
		)
	}

	function getAnimesByGenres(genres: string[], limit?: number) {
		return take(
			getAllAnimes.value.filter(entry =>
				entry.media?.genres.some(genre => genres.includes(genre))
			),
			limit
		)
	}

	function getAnimeByTags(tags: string[], limit?: number) {
		return take(
			getAllAnimes.value.filter(entry =>
				entry.media?.tags.some(tag => tags.includes(tag.name))
			),
			limit
		)
	}

	function getAnimesByMediaIds(ids: number[], limit?: number) {
		const mediaIds = new Set(ids)
		return take(
			getAllAnimes.value.filter(entry => entry.media && mediaIds.has(entry.media.id)),
			limit
		)
	}

	function $reset() {
		entries.value = []
		source.value = null
		isInitialized.value = false
		loading.value = false
		error.value = null
		loadedIdentity.value = null
		pendingRequest = null
	}

	return {
		entries,
		lists,
		source,
		isInitialized,
		loading,
		error,
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

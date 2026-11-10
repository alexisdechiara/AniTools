import { defineStore } from "pinia"
import type {
	AniListAnimeCollectionResponse,
	AniListAnimeListEntry,
	AniListSource
} from "~~/shared/types/anilist"
import {
	groupAnimeEntries,
	sortAnimeEntriesByScore,
	type AnimeListGroup
} from "~/utils/anilist-list"

export type AnimeListEntry = AniListAnimeListEntry

function take<T>(items: T[], limit?: number): T[] {
	return limit === undefined ? items : items.slice(0, Math.max(0, limit))
}

export const useEntriesStore = defineStore("Entries", () => {
	// Resolved once while the store is created: on the server, useRequestFetch() needs the
	// Nuxt context, which is gone after the first await inside an action.
	const requestFetch = import.meta.server ? useRequestFetch() : $fetch

	const user = useUserStore()
	const entries = ref<AnimeListEntry[]>([])
	const source = ref<AniListSource | null>(null)
	const isInitialized = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const loadedIdentity = ref<string | null>(null)
	const stale = ref(false)
	// True when the server could not return the whole list (it exceeds the chunk ceiling).
	const truncated = ref(false)
	let pendingRequest: Promise<AnimeListEntry[]> | null = null
	let pendingIdentity: string | null = null
	// Bumped by $reset() and by a request for another identity: a request only writes
	// the state while the generation it started with is still the current one.
	let generation = 0

	const identity = computed(() => {
		if (!user.isAuthenticated || !user.getUsername) return null
		return `${user.authMode ?? "anonymous"}:${user.getUsername}`
	})

	// A different identity must never see the previous one's list, even before a refetch.
	// Synchronous so the reset always lands before a caller can start the next identity's request.
	watch(identity, (nextIdentity) => {
		if (loadedIdentity.value !== null && loadedIdentity.value !== nextIdentity) {
			$reset()
		}
	}, { flush: "sync" })

	const lists = computed<AnimeListGroup[]>(() => groupAnimeEntries(entries.value))

	async function fetchAllAnimes(force = false): Promise<AnimeListEntry[]> {
		const currentIdentity = identity.value
		if (!currentIdentity) {
			$reset()
			return []
		}
		if (!force && !stale.value && isInitialized.value && loadedIdentity.value === currentIdentity) {
			return entries.value
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
				entries.value = []
				isInitialized.value = false
			}

			try {
				const fetcher = requestFetch
				const username = user.authMode === "public" ? user.getUsername : undefined
				// The collection endpoint returns the whole list in one or two AniList requests,
				// where paging 50 at a time cost one request per 50 entries.
				const collected = await fetcher<AniListAnimeCollectionResponse>("/api/anilist/anime-collection", {
					query: username ? { username } : undefined
				})

				if (requestGeneration !== generation) return entries.value

				source.value = collected.source
				entries.value = collected.entries
				truncated.value = collected.truncated
				loadedIdentity.value = currentIdentity
				isInitialized.value = true
				stale.value = false
				return entries.value
			} catch (caughtError) {
				if (requestGeneration !== generation) throw caughtError

				entries.value = []
				source.value = null
				truncated.value = false
				loadedIdentity.value = currentIdentity
				isInitialized.value = false
				error.value = getApiErrorMessage(caughtError, "Unable to load the AniList anime list.")
				throw caughtError
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
		stale.value = false
		truncated.value = false
		pendingRequest = null
		pendingIdentity = null
		generation += 1
	}

	return {
		entries,
		lists,
		source,
		isInitialized,
		loading,
		error,
		truncated,
		fetchAllAnimes,
		invalidate,
		getAllAnimes,
		getNextAiringAnimesEpisodes,
		getAnimesByStatus,
		getAnimesByGenres,
		getAnimeByTags,
		getAnimesByMediaIds,
		$reset
	}
})

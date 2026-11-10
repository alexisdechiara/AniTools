import { defineStore } from "pinia"
import type {
	AniListActivitiesResponse,
	AniListAnimeActivity,
	AniListSource
} from "~~/shared/types/anilist"
import {
	collectRewindActivities,
	normalizeRewindYear
} from "~/utils/rewind"

interface RewindCacheEntry {
	activities: AniListAnimeActivity[]
	source: AniListSource | null
	truncated: boolean
}

export const useRewindStore = defineStore("Rewind", () => {
	// Resolved once while the store is created: on the server, useRequestFetch() needs the
	// Nuxt context, which is gone after the first await inside an action.
	const requestFetch = import.meta.server ? useRequestFetch() : $fetch

	const user = useUserStore()
	const activities = ref<AniListAnimeActivity[]>([])
	const source = ref<AniListSource | null>(null)
	const year = ref<number | null>(null)
	const truncated = ref(false)
	const loading = ref(false)
	const error = ref<string | null>(null)
	const loadedKey = ref<string | null>(null)
	const cache = new Map<string, RewindCacheEntry>()
	let pendingRequest: Promise<boolean> | null = null
	let pendingKey: string | null = null
	// Bumped by $reset() and by every new request: only the newest request may write the
	// state, so a slow older year can never overwrite the year selected after it.
	let generation = 0

	const identity = computed(() => {
		if (!user.isAuthenticated || !user.getUsername) return null
		return `${user.authMode ?? "anonymous"}:${user.getUsername}`
	})

	// A different identity must never see the previous one's Rewind, even before a refetch.
	// Synchronous so the reset always lands before a caller can start the next identity's request.
	watch(identity, () => {
		$reset()
	}, { flush: "sync" })

	function applyResult(
		cacheKey: string,
		selectedYear: number,
		result: RewindCacheEntry
	) {
		activities.value = result.activities
		source.value = result.source
		truncated.value = result.truncated
		year.value = selectedYear
		loadedKey.value = cacheKey
	}

	async function fetchYear(selectedYear: number, force = false): Promise<boolean> {
		const normalizedYear = normalizeRewindYear(selectedYear)
		const currentIdentity = identity.value

		if (normalizedYear === null) {
			error.value = "Choose a valid year."
			return false
		}
		if (!currentIdentity) {
			$reset()
			return false
		}

		const cacheKey = `${currentIdentity}:${normalizedYear}`
		if (!force) {
			const cached = cache.get(cacheKey)
			if (cached) {
				supersedePendingRequest()
				applyResult(cacheKey, normalizedYear, cached)
				return true
			}
			if (loadedKey.value === cacheKey) return true
			if (pendingRequest && pendingKey === cacheKey) return pendingRequest
		}

		generation += 1
		const requestGeneration = generation
		pendingKey = cacheKey
		pendingRequest = (async () => {
			loading.value = true
			error.value = null

			try {
				const fetcher = requestFetch
				const username = user.authMode === "public" ? user.getUsername : undefined
				const result = await collectRewindActivities(page =>
					fetcher<AniListActivitiesResponse>("/api/anilist/activities", {
						query: {
							...(username ? { username } : {}),
							kind: "anime",
							year: normalizedYear,
							page,
							perPage: 50
						}
					})
				)
				const cachedResult: RewindCacheEntry = {
					activities: result.activities,
					source: result.source,
					truncated: result.truncated
				}

				// The cache is keyed by identity and year, so a superseded result is still safe to keep.
				cache.set(cacheKey, cachedResult)
				if (requestGeneration !== generation) return true

				applyResult(cacheKey, normalizedYear, cachedResult)
				return true
			} catch (caughtError) {
				if (requestGeneration !== generation) return false

				activities.value = []
				source.value = null
				truncated.value = false
				year.value = normalizedYear
				loadedKey.value = null
				error.value = getApiErrorMessage(caughtError, "Unable to load this AniList Rewind.")
				return false
			} finally {
				if (requestGeneration === generation) {
					loading.value = false
					pendingRequest = null
					pendingKey = null
				}
			}
		})()

		return pendingRequest
	}

	// A year answered from the cache is newer than any request still running: that request
	// may no longer write, and the store is no longer loading.
	function supersedePendingRequest() {
		if (!pendingRequest) return
		generation += 1
		loading.value = false
		pendingRequest = null
		pendingKey = null
	}

	function $reset() {
		activities.value = []
		source.value = null
		year.value = null
		truncated.value = false
		loading.value = false
		error.value = null
		loadedKey.value = null
		cache.clear()
		pendingRequest = null
		pendingKey = null
		generation += 1
	}

	return {
		activities,
		source,
		year,
		truncated,
		loading,
		error,
		fetchYear,
		$reset
	}
})

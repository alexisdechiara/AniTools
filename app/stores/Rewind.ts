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

	const identity = computed(() => {
		if (!user.isAuthenticated || !user.getUsername) return null
		return `${user.authMode ?? "anonymous"}:${user.getUsername}`
	})

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
				applyResult(cacheKey, normalizedYear, cached)
				return true
			}
			if (loadedKey.value === cacheKey) return true
			if (pendingRequest && pendingKey === cacheKey) return pendingRequest
		}

		pendingKey = cacheKey
		pendingRequest = (async () => {
			loading.value = true
			error.value = null

			try {
				const fetcher = import.meta.server ? useRequestFetch() : $fetch
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

				cache.set(cacheKey, cachedResult)
				applyResult(cacheKey, normalizedYear, cachedResult)
				return true
			} catch (caughtError) {
				activities.value = []
				source.value = null
				truncated.value = false
				year.value = normalizedYear
				loadedKey.value = null
				error.value = caughtError instanceof Error
					? caughtError.message
					: "Unable to load this AniList Rewind."
				return false
			} finally {
				loading.value = false
				pendingRequest = null
				pendingKey = null
			}
		})()

		return pendingRequest
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

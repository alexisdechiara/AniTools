import type {
	AniListActivitiesResponse,
	AniListAnimeActivity,
	AniListPageInfo
} from "~~/shared/types/anilist"

interface TimelineCacheEntry {
	expiresAt: number
	response: AniListActivitiesResponse
}

const CLIENT_CACHE_TTL_MS = 5 * 60_000
const MAX_TIMELINE_PAGES = 100
const TIMELINE_ACTIVITY_KIND = "anime" as const
const timelinePageCache = new Map<string, TimelineCacheEntry>()

function errorMessage(error: unknown) {
	return error instanceof Error && error.message
		? error.message
		: "Unable to load AniList activity."
}

export function useTimeline() {
	const userStore = useUserStore()
	const activities = ref<AniListAnimeActivity[]>([])
	const pageInfo = ref<AniListPageInfo>({
		currentPage: 1,
		hasNextPage: false,
		lastPage: null,
		perPage: 20,
		total: 0
	})
	const loading = ref(false)
	const loadingMore = ref(false)
	const initialized = ref(false)
	const error = ref<string | null>(null)
	const safetyLimitReached = computed(() =>
		pageInfo.value.hasNextPage
		&& pageInfo.value.currentPage >= MAX_TIMELINE_PAGES
	)
	const hasMore = computed(() => pageInfo.value.hasNextPage && !safetyLimitReached.value)

	function accessQuery(): Record<string, string> {
		if (userStore.authMode === "public" && userStore.publicUsername) {
			return { username: userStore.publicUsername }
		}

		return {}
	}

	function cacheKey(page: number) {
		const source = userStore.authMode === "public"
			? `public:${userStore.publicUsername ?? ""}`
			: `oauth:${userStore.username}`
		return [
			source,
			TIMELINE_ACTIVITY_KIND,
			page
		].join(":")
	}

	async function fetchPage(page: number, force = false) {
		const key = cacheKey(page)
		const cached = import.meta.client ? timelinePageCache.get(key) : undefined
		if (!force && cached && cached.expiresAt > Date.now()) return cached.response

		const response = await $fetch<AniListActivitiesResponse>(
			"/api/anilist/activities",
			{
				query: {
					...accessQuery(),
					page,
					perPage: 50,
					kind: TIMELINE_ACTIVITY_KIND
				}
			}
		)

		if (import.meta.client) {
			timelinePageCache.set(key, {
				expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
				response
			})
		}
		return response
	}

	function mergeActivities(nextActivities: readonly AniListAnimeActivity[]) {
		const unique = new Map(activities.value.map(activity => [activity.id, activity]))
		for (const activity of nextActivities) unique.set(activity.id, activity)
		activities.value = [...unique.values()].toSorted((left, right) =>
			right.createdAt - left.createdAt || right.id - left.id
		)
	}

	async function load(force = false) {
		loading.value = true
		error.value = null

		try {
			const response = await fetchPage(1, force)
			activities.value = []
			mergeActivities(response.activities.filter(
				(activity): activity is AniListAnimeActivity => activity.kind === "anime"
			))
			pageInfo.value = response.pageInfo
		} catch (caughtError) {
			activities.value = []
			error.value = errorMessage(caughtError)
		} finally {
			loading.value = false
			initialized.value = true
		}
	}

	async function loadMore() {
		if (
			loadingMore.value
			|| !pageInfo.value.hasNextPage
			|| safetyLimitReached.value
		) return

		loadingMore.value = true
		error.value = null

		try {
			const response = await fetchPage(pageInfo.value.currentPage + 1)
			mergeActivities(response.activities.filter(
				(activity): activity is AniListAnimeActivity => activity.kind === "anime"
			))
			pageInfo.value = response.pageInfo
		} catch (caughtError) {
			error.value = errorMessage(caughtError)
		} finally {
			loadingMore.value = false
		}
	}

	return {
		activities,
		pageInfo,
		loading,
		loadingMore,
		initialized,
		error,
		hasMore,
		safetyLimitReached,
		load,
		loadMore
	}
}

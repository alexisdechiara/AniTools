import type {
	AniListActivitiesResponse,
	AniListActivity,
	AniListActivityKind,
	AniListPageInfo
} from "~~/shared/types/anilist"
import {
	getTimelineWindow,
	groupTimelineActivities,
	type TimelineView,
	type TimelineWindow
} from "~/utils/timeline"

interface TimelineCacheEntry {
	expiresAt: number
	response: AniListActivitiesResponse
}

const CLIENT_CACHE_TTL_MS = 5 * 60_000
const MAX_TIMELINE_PAGES = 8
const timelinePageCache = new Map<string, TimelineCacheEntry>()

function errorMessage(error: unknown) {
	return error instanceof Error && error.message
		? error.message
		: "Unable to load AniList activity."
}

export function useTimeline() {
	const userStore = useUserStore()
	const view = ref<TimelineView>("weeks")
	const kind = ref<AniListActivityKind>("anime")
	const window = ref<TimelineWindow>(getTimelineWindow("weeks"))
	const activities = ref<AniListActivity[]>([])
	const pageInfo = ref<AniListPageInfo>({
		currentPage: 1,
		hasNextPage: false,
		lastPage: null,
		perPage: 20,
		total: 0
	})
	const loading = ref(false)
	const loadingMore = ref(false)
	const error = ref<string | null>(null)
	const safetyLimitReached = computed(() =>
		pageInfo.value.hasNextPage
		&& pageInfo.value.currentPage >= MAX_TIMELINE_PAGES
	)
	const groups = computed(() => groupTimelineActivities(activities.value, view.value))

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
			view.value,
			kind.value,
			window.value.from,
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
					perPage: 20,
					kind: kind.value,
					from: window.value.from,
					to: window.value.to
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

	function mergeActivities(nextActivities: readonly AniListActivity[]) {
		const unique = new Map(activities.value.map(activity => [activity.id, activity]))
		for (const activity of nextActivities) unique.set(activity.id, activity)
		activities.value = [...unique.values()].toSorted((left, right) =>
			right.createdAt - left.createdAt || right.id - left.id
		)
	}

	async function load(force = false) {
		loading.value = true
		error.value = null
		window.value = getTimelineWindow(view.value)

		try {
			const response = await fetchPage(1, force)
			activities.value = []
			mergeActivities(response.activities)
			pageInfo.value = response.pageInfo
		} catch (caughtError) {
			activities.value = []
			error.value = errorMessage(caughtError)
		} finally {
			loading.value = false
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
			mergeActivities(response.activities)
			pageInfo.value = response.pageInfo
		} catch (caughtError) {
			error.value = errorMessage(caughtError)
		} finally {
			loadingMore.value = false
		}
	}

	async function setView(nextView: TimelineView) {
		if (view.value === nextView) return
		view.value = nextView
		await load()
	}

	async function setKind(nextKind: AniListActivityKind) {
		if (kind.value === nextKind) return
		kind.value = nextKind
		await load()
	}

	return {
		view,
		kind,
		window,
		activities,
		groups,
		pageInfo,
		loading,
		loadingMore,
		error,
		safetyLimitReached,
		load,
		loadMore,
		setView,
		setKind
	}
}

import { getSafeInternalPath } from "~/utils/navigation"

export const useAuth = () => {
	const entriesStore = useEntriesStore()
	const userStore = useUserStore()
	const statisticsStore = useStatisticsStore()
	const calendarStore = useCalendarStore()

	const route = useRoute()

	function loginWithAniList(returnTo = route.query.redirect?.toString() || "/") {
		const safeReturnTo = getSafeInternalPath(returnTo, "/")
		const target = `/auth/anilist?returnTo=${encodeURIComponent(safeReturnTo)}`
		return navigateTo(target, { external: true })
	}

	async function logout() {
		try {
			await $fetch("/api/auth/logout", {
				method: "POST"
			})
		} finally {
			userStore.$reset()
			entriesStore.$reset()
			statisticsStore.$reset()
			// The status filter reads the list that was just dropped: a guest must not keep it.
			calendarStore.setStatuses([])
		}

		return navigateTo({
			path: "/login",
			query: {
				redirect: route.fullPath
			}
		})
	}

	return {
		loginWithAniList,
		logout
	}
}

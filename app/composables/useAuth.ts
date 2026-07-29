export const useAuth = () => {
	const entriesStore = useEntriesStore()
	const userStore = useUserStore()
	const statisticsStore = useStatisticsStore()

	const route = useRoute()

	function loginWithAniList(returnTo = route.query.redirect?.toString() || "/") {
		const target = `/auth/anilist?returnTo=${encodeURIComponent(returnTo)}`
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

export const useAuth = () => {
	const entriesStore = useEntriesStore()
	const userStore = useUserStore()
	const statisticsStore = useStatisticsStore()

	const route = useRoute()

	function logout() {
		userStore.$reset()
		entriesStore.$reset()
		statisticsStore.$reset()
		return navigateTo({
			path: "/login",
			query: {
				redirect: route.fullPath
			}
		})
	}

	return {
		logout
	}
}

export function useAniListOverviewData() {
	const userStore = useUserStore()
	const entriesStore = useEntriesStore()
	const statisticsStore = useStatisticsStore()
	const loading = computed(() => entriesStore.loading || statisticsStore.loading)
	const error = computed(() => entriesStore.error ?? statisticsStore.error)

	async function load(force = false) {
		if (!userStore.isAuthenticated) return false

		const results = await Promise.allSettled([
			entriesStore.fetchAllAnimes(force),
			statisticsStore.fetchStatistics(force)
		])

		return results.every(result =>
			result.status === "fulfilled" && result.value !== false
		)
	}

	return {
		load,
		loading,
		error
	}
}

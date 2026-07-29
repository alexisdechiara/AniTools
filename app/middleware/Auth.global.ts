import {
	FEATURE_ACCESS,
	canAccessFeature,
	type FeatureIdentity
} from "#shared/config/features"

export default defineNuxtRouteMiddleware(async (to) => {
	const access = to.meta.auth ?? FEATURE_ACCESS.oauth

	if (access.mode === "public") {
		return
	}

	const userStore = useUserStore()
	const statisticsStore = useStatisticsStore()
	const entriesStore = useEntriesStore()

	try {
		await userStore.restoreSession()

		const identity: FeatureIdentity = userStore.isOAuthAuthenticated
			? "oauth"
			: userStore.authMode === "public"
				? "public-profile"
				: "anonymous"

		if (!canAccessFeature(access, identity)) {
			return navigateTo({
				path: "/login",
				query: {
					redirect: to.fullPath
				}
			})
		}

		const userId = userStore.getId

		if (userId) {
			const pendingRequests: Promise<unknown>[] = []

			if (!statisticsStore.isInitialized) {
				pendingRequests.push(statisticsStore.fetchStatistics(userId))
			}
			if (!entriesStore.isInitialized) {
				pendingRequests.push(entriesStore.fetchAllAnimes(userId))
			}

			await Promise.all(pendingRequests)
		}

		return
	} catch (error) {
		console.error("Error while verifying authentication:", error)

		if (access.mode === "optional") {
			return
		}

		return navigateTo("/login")
	}
})

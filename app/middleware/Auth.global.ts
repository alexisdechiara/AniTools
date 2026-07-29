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

		return
	} catch (error) {
		console.error("Error while verifying authentication:", error)

		if (access.mode === "optional") {
			return
		}

		return navigateTo("/login")
	}
})

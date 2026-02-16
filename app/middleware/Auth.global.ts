// Définition des routes publiques qui ne nécessitent pas d'authentification
const publicPaths = ["/login", "/test"]
// Routes qui fonctionnent avec et sans authentification
const hybridPaths = ["/tierlist", "/calendar"]

export default defineNuxtRouteMiddleware(async (to) => {
	// Si c'est une route publique, on ne fait rien
	if (publicPaths.includes(to.path)) {
		return
	}

	const userStore = useUserStore()
	const statisticsStore = useStatisticsStore()
	const entriesStore = useEntriesStore()

	try {
		// Si l'utilisateur est chargé dans le store (grâce à pinia-plugin-persistedstate)
		if (userStore.isAuthenticated) {
			if (!statisticsStore.isInitialized) {
				await statisticsStore.fetchStatistics(userStore.getId!)
			}
			if (!entriesStore.isInitialized) {
				await entriesStore.fetchAllAnimes(userStore.getId!)
			}
			return
		}

		// Si on arrive ici, l'utilisateur n'est pas authentifié
		// On redirige vers la page de connexion avec un paramètre de retour
		if (!hybridPaths.includes(to.path)) {
			return navigateTo({
				path: "/login",
				query: {
					redirect: to.fullPath
				}
			})
		}
	} catch (error) {
		console.error("Error while verifying authentication:", error)
		// En cas d'erreur, on redirige vers la page de connexion
		return navigateTo("/login")
	}
})

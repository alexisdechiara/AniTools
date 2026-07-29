const LEGACY_COOKIE_NAMES = ["User", "tierlist"] as const

export default defineNuxtPlugin(() => {
	for (const name of LEGACY_COOKIE_NAMES) {
		const legacyCookie = useCookie(name, {
			path: "/"
		})

		if (legacyCookie.value !== null && legacyCookie.value !== undefined) {
			legacyCookie.value = null
		}
	}
})

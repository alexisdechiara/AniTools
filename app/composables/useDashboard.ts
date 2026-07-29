import { createSharedComposable } from "@vueuse/core"

const _useDashboard = () => {
	const router = useRouter()

	defineShortcuts({
		"g-h": () => router.push("/"),
		"g-c": () => router.push("/calendar"),
		"g-s": () => router.push("/statistics"),
		"g-t": () => router.push("/tierlist"),
		"g-r": () => router.push(`/rewind/${new Date().getFullYear()}`)
	})
}

export const useDashboard = createSharedComposable(_useDashboard)

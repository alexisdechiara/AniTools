import { createSharedComposable } from "@vueuse/core"
import { getDefaultRewindYear } from "#shared/config/features"

const _useDashboard = () => {
	const router = useRouter()

	defineShortcuts({
		"g-h": () => router.push("/"),
		"g-c": () => router.push("/calendar"),
		"g-s": () => router.push("/statistics"),
		"g-t": () => router.push("/tierlist"),
		"g-r": () => router.push(`/rewind/${getDefaultRewindYear(new Date())}`)
	})
}

export const useDashboard = createSharedComposable(_useDashboard)

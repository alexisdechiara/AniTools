import type { NavigationMenuItem } from "@nuxt/ui"
import {
	FEATURE_IDS,
	FEATURE_NAVIGATION_GROUPS,
	FEATURE_REGISTRY,
	featureNeedsProfile,
	getDefaultRewindYear,
	resolveFeaturePath,
	type FeatureId
} from "#shared/config/features"

interface UseAppNavigationOptions {
	onSelect?: () => void
	/** Year the Rewind link opens; defaults to the last completed year (the current one in December). */
	rewindYear?: number
}

/** Shown next to personal pages while no profile is connected; they lead to the login page. */
export const NAVIGATION_LOCK_LABEL = "Needs a profile"

export function useAppNavigation(options: UseAppNavigationOptions = {}) {
	const rewindYear = options.rewindYear ?? getDefaultRewindYear(new Date())
	const route = useRoute()
	const userStore = useUserStore()

	function toNavigationItem(featureId: FeatureId, locked: boolean): NavigationMenuItem {
		const feature = FEATURE_REGISTRY[featureId]
		const children = FEATURE_IDS
			.filter(childId => FEATURE_REGISTRY[childId].parent === featureId)
			.map(childId => toNavigationItem(childId, false))
		const hasActiveChild = children.some(child => child.to === route.path)

		return {
			label: feature.label,
			icon: feature.icon,
			to: resolveFeaturePath(featureId, { year: rewindYear }),
			disabled: feature.status === "planned",
			onSelect: options.onSelect,
			...(locked
				? {
					slot: "locked" as const,
					tooltip: { text: `${feature.label} · ${NAVIGATION_LOCK_LABEL.toLowerCase()}` }
				}
				: {}),
			// A guest cannot open the sub-pages either: the parent link alone explains why.
			...(children.length > 0 && !locked
				? { children, defaultOpen: hasActiveChild }
				: {})
		}
	}

	const items = computed<NavigationMenuItem[][]>(() => {
		const isGuest = !userStore.isAuthenticated

		return FEATURE_NAVIGATION_GROUPS.map(group => [
			{ type: "label" as const, label: group.label },
			...group.features.map(featureId =>
				toNavigationItem(featureId, isGuest && featureNeedsProfile(featureId))
			)
		])
	})

	return {
		items
	}
}

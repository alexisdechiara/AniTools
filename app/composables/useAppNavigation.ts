import type { NavigationMenuItem } from "@nuxt/ui"
import {
	FEATURE_IDS,
	FEATURE_REGISTRY,
	resolveFeaturePath,
	type FeatureId
} from "#shared/config/features"

interface UseAppNavigationOptions {
	onSelect?: () => void
	currentYear?: number
}

export function useAppNavigation(options: UseAppNavigationOptions = {}) {
	const currentYear = options.currentYear ?? new Date().getFullYear()
	const route = useRoute()

	function toNavigationItem(featureId: FeatureId): NavigationMenuItem {
		const feature = FEATURE_REGISTRY[featureId]
		const children = FEATURE_IDS
			.filter(childId => FEATURE_REGISTRY[childId].parent === featureId)
			.map(childId => toNavigationItem(childId))
		const hasActiveChild = children.some(child => child.to === route.path)

		return {
			label: feature.label,
			icon: feature.icon,
			to: resolveFeaturePath(featureId, { year: currentYear }),
			disabled: feature.status === "planned",
			onSelect: options.onSelect,
			...(children.length > 0
				? { children, defaultOpen: hasActiveChild }
				: {})
		}
	}

	const items = FEATURE_IDS
		.filter(featureId => FEATURE_REGISTRY[featureId].navigation === "primary")
		.map(featureId => toNavigationItem(featureId))

	return {
		items
	}
}

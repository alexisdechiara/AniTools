export type FeatureAccessMode = "public" | "optional" | "oauth"
export type FeatureIdentity = "anonymous" | "public-profile" | "oauth"
export type FeatureStatus = "available" | "beta" | "planned"
export type FeatureNavigationPlacement = "primary" | "secondary" | "child" | "hidden"
export type FeatureNavigationGroupId = "your-list" | "tools" | "app"

export interface FeatureAccessPolicy {
	readonly mode: FeatureAccessMode
	readonly allowPublicProfile?: boolean
}

export const FEATURE_ACCESS = {
	public: {
		mode: "public"
	},
	optional: {
		mode: "optional"
	},
	oauth: {
		mode: "oauth"
	},
	oauthWithPublicProfile: {
		mode: "oauth",
		allowPublicProfile: true
	}
} as const satisfies Record<string, FeatureAccessPolicy>

export const FEATURE_IDS = [
	"dashboard",
	"statistics",
	"statistics-overview",
	"statistics-genres",
	"statistics-tags",
	"statistics-voice-actors",
	"statistics-studios",
	"statistics-staff",
	"rewind",
	"tierlist",
	"calendar",
	"create",
	"explore",
	"podium",
	"timeline",
	"settings",
	"support",
	"login"
] as const

export type FeatureId = typeof FEATURE_IDS[number]

export interface FeatureDefinition {
	readonly label: string
	readonly icon: string
	readonly path: string
	readonly access: FeatureAccessPolicy
	readonly indexable: boolean
	readonly status: FeatureStatus
	readonly navigation: FeatureNavigationPlacement
	readonly parent?: FeatureId
}

export interface FeatureNavigationGroup {
	readonly id: FeatureNavigationGroupId
	readonly label: string
	readonly features: readonly FeatureId[]
}

/**
 * Sidebar order. "Your list" needs an AniList profile, "Tools" work without one and the last
 * group holds the pages about the app itself.
 */
export const FEATURE_NAVIGATION_GROUPS: readonly FeatureNavigationGroup[] = [
	{
		id: "your-list",
		label: "Your list",
		features: ["dashboard", "statistics", "rewind", "timeline", "podium", "explore"]
	},
	{
		id: "tools",
		label: "Tools",
		features: ["calendar", "tierlist", "create"]
	},
	{
		id: "app",
		label: "AniTools",
		features: ["settings", "support"]
	}
]

/** Document title for a feature page: child pages carry their parent, e.g. "Genres · Statistics". */
export function getFeaturePageTitle(featureId: FeatureId): string {
	const feature = FEATURE_REGISTRY[featureId]
	return feature.parent
		? `${feature.label} · ${FEATURE_REGISTRY[feature.parent].label}`
		: feature.label
}

export const FEATURE_REGISTRY: Readonly<Record<FeatureId, FeatureDefinition>> = {
	dashboard: {
		label: "Dashboard",
		icon: "i-lucide-layout-dashboard",
		path: "/",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	statistics: {
		label: "Statistics",
		icon: "i-lucide-chart-no-axes-combined",
		path: "/statistics",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	"statistics-overview": {
		label: "Overview",
		icon: "i-lucide-chart-pie",
		path: "/statistics",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "available",
		navigation: "child",
		parent: "statistics"
	},
	"statistics-genres": {
		label: "Genres",
		icon: "i-lucide-shapes",
		path: "/statistics/genres",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "child",
		parent: "statistics"
	},
	"statistics-tags": {
		label: "Tags",
		icon: "i-lucide-tags",
		path: "/statistics/tags",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "child",
		parent: "statistics"
	},
	"statistics-voice-actors": {
		label: "Voice Actors",
		icon: "i-lucide-mic-2",
		path: "/statistics/voice-actors",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "child",
		parent: "statistics"
	},
	"statistics-studios": {
		label: "Studios",
		icon: "i-lucide-building-2",
		path: "/statistics/studios",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "child",
		parent: "statistics"
	},
	"statistics-staff": {
		label: "Staff",
		icon: "i-lucide-users",
		path: "/statistics/staff",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "child",
		parent: "statistics"
	},
	rewind: {
		label: "Rewind",
		icon: "i-lucide-rewind",
		path: "/rewind/:year",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	tierlist: {
		label: "Tier list",
		icon: "i-lucide-rows-3",
		path: "/tierlist",
		access: FEATURE_ACCESS.optional,
		indexable: true,
		status: "beta",
		navigation: "primary"
	},
	calendar: {
		label: "Calendar",
		icon: "i-lucide-calendar-days",
		path: "/calendar",
		access: FEATURE_ACCESS.optional,
		indexable: true,
		status: "available",
		navigation: "primary"
	},
	create: {
		label: "Create",
		icon: "i-lucide-circle-fading-plus",
		path: "/create",
		access: FEATURE_ACCESS.optional,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	explore: {
		label: "Explore",
		icon: "i-lucide-telescope",
		path: "/explore",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	podium: {
		label: "Podium",
		icon: "i-lucide-trophy",
		path: "/podium",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	timeline: {
		label: "Timeline",
		icon: "i-lucide-chart-no-axes-gantt",
		path: "/timeline",
		access: FEATURE_ACCESS.oauthWithPublicProfile,
		indexable: false,
		status: "beta",
		navigation: "primary"
	},
	settings: {
		label: "Settings",
		icon: "i-lucide-settings",
		path: "/settings",
		access: FEATURE_ACCESS.public,
		indexable: false,
		status: "available",
		navigation: "secondary"
	},
	support: {
		label: "Support",
		icon: "i-lucide-circle-help",
		path: "/support",
		access: FEATURE_ACCESS.public,
		indexable: true,
		status: "available",
		navigation: "secondary"
	},
	login: {
		label: "Sign in",
		icon: "i-custom-anilist",
		path: "/login",
		access: FEATURE_ACCESS.public,
		indexable: false,
		status: "available",
		navigation: "hidden"
	}
}

export function canAccessFeature(
	policy: FeatureAccessPolicy,
	identity: FeatureIdentity
): boolean {
	if (policy.mode === "public" || policy.mode === "optional") {
		return true
	}

	if (identity === "oauth") {
		return true
	}

	return identity === "public-profile" && policy.allowPublicProfile === true
}

export function resolveFeaturePath(
	featureId: FeatureId,
	parameters: Readonly<Record<string, string | number>> = {}
): string {
	return FEATURE_REGISTRY[featureId].path.replace(/:([a-zA-Z]\w*)/g, (match, parameter: string) => {
		const value = parameters[parameter]

		if (value === undefined) {
			throw new Error(`Missing "${parameter}" parameter for feature "${featureId}"`)
		}

		return encodeURIComponent(String(value))
	})
}

/** True when a guest is sent to the login page instead of the feature. */
export function featureNeedsProfile(featureId: FeatureId): boolean {
	return !canAccessFeature(FEATURE_REGISTRY[featureId].access, "anonymous")
}

function matchesFeaturePath(pattern: string, pathname: string): boolean {
	const patternSegments = pattern.split("/")
	const pathSegments = pathname.split("/")

	return patternSegments.length === pathSegments.length
		&& patternSegments.every((segment, index) => {
			const candidate = pathSegments[index] ?? ""
			return segment.startsWith(":") ? candidate !== "" : segment === candidate
		})
}

/**
 * Finds the top-level feature an internal path belongs to, ignoring its query and hash:
 * "/statistics/genres?sort=count" is Statistics. Unknown paths and the login page return null.
 */
export function findFeatureByPath(path: string): FeatureId | null {
	const pathname = (path.split(/[?#]/)[0] ?? "").replace(/(?!^)\/+$/, "")
	if (!pathname.startsWith("/")) return null

	const match = FEATURE_IDS.find(featureId =>
		FEATURE_REGISTRY[featureId].navigation !== "hidden"
		&& FEATURE_REGISTRY[featureId].navigation !== "child"
		&& matchesFeaturePath(FEATURE_REGISTRY[featureId].path, pathname)
	) ?? FEATURE_IDS.find(featureId =>
		FEATURE_REGISTRY[featureId].navigation === "child"
		&& matchesFeaturePath(FEATURE_REGISTRY[featureId].path, pathname)
	)
	if (!match) return null

	return FEATURE_REGISTRY[match].parent ?? match
}

/**
 * The year a bare "Rewind" link opens: a recap of the running year is mostly empty until it
 * ends, so the last completed year is shown until December.
 */
export function getDefaultRewindYear(now: Date): number {
	const year = now.getUTCFullYear()
	return now.getUTCMonth() === 11 ? year : year - 1
}

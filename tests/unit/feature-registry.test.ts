import { describe, expect, it } from "vitest"
import {
	FEATURE_ACCESS,
	FEATURE_IDS,
	FEATURE_NAVIGATION_GROUPS,
	FEATURE_REGISTRY,
	canAccessFeature,
	featureNeedsProfile,
	findFeatureByPath,
	getDefaultRewindYear,
	resolveFeaturePath
} from "../../shared/config/features"

describe("feature registry", () => {
	it("defines every feature with navigation, access and indexing metadata", () => {
		for (const featureId of FEATURE_IDS) {
			const feature = FEATURE_REGISTRY[featureId]

			expect(feature.label).not.toBe("")
			expect(feature.icon).not.toBe("")
			expect(feature.path).toMatch(/^\//)
			expect(feature.access.mode).toMatch(/^(public|optional|oauth)$/)
			expect(typeof feature.indexable).toBe("boolean")
			expect(feature.status).toMatch(/^(available|beta|planned)$/)
		}
	})

	it("keeps Calendar and Tier list available without authentication", () => {
		expect(FEATURE_REGISTRY.calendar.access).toEqual(FEATURE_ACCESS.optional)
		expect(FEATURE_REGISTRY.tierlist.access).toEqual(FEATURE_ACCESS.optional)
		expect(canAccessFeature(FEATURE_REGISTRY.calendar.access, "anonymous")).toBe(true)
		expect(canAccessFeature(FEATURE_REGISTRY.tierlist.access, "anonymous")).toBe(true)
	})

	it("allows Dashboard data from OAuth or the explicit public-profile flow", () => {
		const access = FEATURE_REGISTRY.dashboard.access

		expect(access.mode).toBe("oauth")
		expect(canAccessFeature(access, "anonymous")).toBe(false)
		expect(canAccessFeature(access, "public-profile")).toBe(true)
		expect(canAccessFeature(access, "oauth")).toBe(true)
	})

	it("keeps strict OAuth policies unavailable to public profiles", () => {
		expect(canAccessFeature(FEATURE_ACCESS.oauth, "public-profile")).toBe(false)
		expect(canAccessFeature(FEATURE_ACCESS.oauth, "oauth")).toBe(true)
	})

	it("exposes every implemented statistics view and creation studio", () => {
		const implementedFeatureIds = [
			"statistics-genres",
			"statistics-tags",
			"statistics-voice-actors",
			"statistics-studios",
			"statistics-staff",
			"create"
		] as const

		for (const featureId of implementedFeatureIds) {
			expect(FEATURE_REGISTRY[featureId].status).not.toBe("planned")
		}

		expect(FEATURE_REGISTRY.create.navigation).toBe("primary")
	})

	it("keeps Settings and Support public in the secondary navigation", () => {
		for (const featureId of ["settings", "support"] as const) {
			const feature = FEATURE_REGISTRY[featureId]

			expect(canAccessFeature(feature.access, "anonymous")).toBe(true)
			expect(feature.navigation).toBe("secondary")
		}

		expect(FEATURE_REGISTRY.support.indexable).toBe(true)
		expect(FEATURE_REGISTRY.settings.indexable).toBe(false)
	})

	it("serves Podium from OAuth or a public profile, without indexing it", () => {
		const podium = FEATURE_REGISTRY.podium

		expect(canAccessFeature(podium.access, "anonymous")).toBe(false)
		expect(canAccessFeature(podium.access, "public-profile")).toBe(true)
		expect(podium.indexable).toBe(false)
	})

	it("resolves dynamic navigation paths", () => {
		expect(resolveFeaturePath("rewind", { year: 2026 })).toBe("/rewind/2026")
		expect(() => resolveFeaturePath("rewind")).toThrowError(
			'Missing "year" parameter for feature "rewind"'
		)
	})

	it("groups every navigation destination exactly once, in sidebar order", () => {
		expect(FEATURE_NAVIGATION_GROUPS.map(group => [group.id, group.label, group.features])).toEqual([
			["your-list", "Your list", ["dashboard", "statistics", "rewind", "timeline", "podium", "explore"]],
			["tools", "Tools", ["calendar", "tierlist", "create"]],
			["app", "AniTools", ["settings", "support"]]
		])

		const grouped = FEATURE_NAVIGATION_GROUPS.flatMap(group => group.features)
		const navigable = FEATURE_IDS.filter((featureId) => {
			const placement = FEATURE_REGISTRY[featureId].navigation
			return placement === "primary" || placement === "secondary"
		})

		expect(new Set(grouped).size).toBe(grouped.length)
		expect(grouped.toSorted()).toEqual(navigable.toSorted())
	})

	it("keeps personal pages in \"Your list\" and no-account tools in \"Tools\"", () => {
		const [yourList, tools, app] = FEATURE_NAVIGATION_GROUPS

		expect(yourList?.features.every(featureNeedsProfile)).toBe(true)
		expect(tools?.features.some(featureNeedsProfile)).toBe(false)
		expect(app?.features.some(featureNeedsProfile)).toBe(false)
	})

	it("names the tier list tool \"Tier list\" without changing its id or route", () => {
		expect(FEATURE_REGISTRY.tierlist.label).toBe("Tier list")
		expect(FEATURE_REGISTRY.tierlist.path).toBe("/tierlist")
	})

	it("finds the top-level feature behind an internal path", () => {
		expect(findFeatureByPath("/")).toBe("dashboard")
		expect(findFeatureByPath("/statistics")).toBe("statistics")
		expect(findFeatureByPath("/statistics/genres?sort=count")).toBe("statistics")
		expect(findFeatureByPath("/rewind/2025")).toBe("rewind")
		expect(findFeatureByPath("/explore/")).toBe("explore")
		expect(findFeatureByPath("/tierlist#share")).toBe("tierlist")
		expect(findFeatureByPath("/rewind")).toBeNull()
		expect(findFeatureByPath("/login")).toBeNull()
		expect(findFeatureByPath("/unknown")).toBeNull()
		expect(findFeatureByPath("")).toBeNull()
	})

	it("opens Rewind on the last completed year until December", () => {
		expect(getDefaultRewindYear(new Date(Date.UTC(2026, 0, 1)))).toBe(2025)
		expect(getDefaultRewindYear(new Date(Date.UTC(2026, 10, 30, 23, 59)))).toBe(2025)
		expect(getDefaultRewindYear(new Date(Date.UTC(2026, 11, 1)))).toBe(2026)
		expect(getDefaultRewindYear(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe(2026)
	})
})

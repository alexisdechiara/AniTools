import { describe, expect, it } from "vitest"
import {
	FEATURE_ACCESS,
	FEATURE_IDS,
	FEATURE_REGISTRY,
	canAccessFeature,
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

	it("keeps Calendar and Tierlist available without authentication", () => {
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

	it("exposes the implemented people statistics views as beta features", () => {
		expect(FEATURE_REGISTRY["statistics-voice-actors"].status).toBe("beta")
		expect(FEATURE_REGISTRY["statistics-staff"].status).toBe("beta")
	})

	it("resolves dynamic navigation paths", () => {
		expect(resolveFeaturePath("rewind", { year: 2026 })).toBe("/rewind/2026")
		expect(() => resolveFeaturePath("rewind")).toThrowError(
			'Missing "year" parameter for feature "rewind"'
		)
	})
})

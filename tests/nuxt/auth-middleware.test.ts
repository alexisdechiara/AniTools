import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { RouteLocationNormalized } from "vue-router"
import authMiddleware from "~/middleware/Auth.global"
import { useUserStore } from "~/stores/User"
import { FEATURE_ACCESS, type FeatureAccessPolicy } from "~~/shared/config/features"

const { navigateToMock } = vi.hoisted(() => ({
	navigateToMock: vi.fn()
}))

mockNuxtImport("navigateTo", () => navigateToMock)

function resolveRoute(path: string): RouteLocationNormalized {
	return useRouter().resolve(path) as RouteLocationNormalized
}

/** A matched page that declares no feature meta, or the given access policy. */
function matchedRoute(path: string, auth?: FeatureAccessPolicy): RouteLocationNormalized {
	const home = resolveRoute("/")

	return {
		...home,
		path,
		fullPath: path,
		meta: auth ? { auth } : {}
	}
}

async function run(to: RouteLocationNormalized) {
	return await useNuxtApp().runWithContext(() => authMiddleware(to, resolveRoute("/")))
}

describe("auth global middleware", () => {
	beforeEach(() => {
		useUserStore().$reset()
		navigateToMock.mockImplementation((target: unknown) => target)
	})

	it("lets a URL that matches no page through so Nuxt answers 404", async () => {
		const restoreSession = vi.spyOn(useUserStore(), "restoreSession").mockResolvedValue(false)

		for (const path of ["/nope-404", "/rewind", "/statistics/unknown/deeper"]) {
			const to = resolveRoute(path)

			expect(to.matched).toHaveLength(0)
			expect(await run(to)).toBeUndefined()
		}

		expect(navigateToMock).not.toHaveBeenCalled()
		expect(restoreSession).not.toHaveBeenCalled()
	})

	it("still redirects an anonymous visitor away from a real personal route", async () => {
		vi.spyOn(useUserStore(), "restoreSession").mockResolvedValue(false)
		const to = resolveRoute("/statistics/genres?sort=count")

		expect(to.matched.length).toBeGreaterThan(0)
		await run(to)

		expect(navigateToMock).toHaveBeenCalledExactlyOnceWith({
			path: "/login",
			query: { redirect: "/statistics/genres?sort=count" }
		})
	})

	it("treats a matched page without feature meta as OAuth-only", async () => {
		vi.spyOn(useUserStore(), "restoreSession").mockResolvedValue(false)

		await run(matchedRoute("/unlisted"))

		expect(navigateToMock).toHaveBeenCalledExactlyOnceWith({
			path: "/login",
			query: { redirect: "/unlisted" }
		})
	})

	it("never restores a session for a public page", async () => {
		const restoreSession = vi.spyOn(useUserStore(), "restoreSession").mockResolvedValue(false)

		expect(await run(matchedRoute("/calendar", FEATURE_ACCESS.public))).toBeUndefined()

		expect(restoreSession).not.toHaveBeenCalled()
		expect(navigateToMock).not.toHaveBeenCalled()
	})
})

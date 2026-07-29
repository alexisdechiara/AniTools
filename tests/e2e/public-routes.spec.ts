import { expect, test } from "@playwright/test"

test("Tierlist remains usable without an AniList session", async ({ page }) => {
	await page.route("https://graphql.anilist.co/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				data: {
					MediaListCollection: {
						lists: []
					}
				}
			})
		})
	})

	const response = await page.goto("/tierlist", {
		waitUntil: "domcontentloaded"
	})

	expect(response).not.toBeNull()
	expect(response?.ok()).toBe(true)
	expect(response?.headers()["x-frame-options"]).toBe("DENY")
	expect(response?.headers()["x-content-type-options"]).toBe("nosniff")
	await expect(page).toHaveURL(/\/tierlist$/)
	await expect(page).toHaveTitle("Anime Tier List | AniTools")
	await expect(page.getByRole("button", { name: "Search animes..." })).toBeVisible()
})

test("the unauthenticated session endpoint never exposes a token", async ({ request }) => {
	const response = await request.get("/api/auth/session")

	expect(response.status()).toBe(200)
	expect(response.headers()["cache-control"]).toContain("private")
	expect(response.headers()["cache-control"]).toContain("no-store")

	const body = await response.json()
	expect(body).toEqual({
		authenticated: false,
		expiresAt: null,
		user: null
	})
	expect(JSON.stringify(body)).not.toContain("accessToken")
})

import { expect, test } from "@playwright/test"

function tierlistEntry(id: number, title: string) {
	return {
		score: 80,
		media: {
			id,
			title: { userPreferred: title }
		}
	}
}

test("Tierlist remains usable without an AniList session", async ({ page }) => {
	const browserAniListRequests: string[] = []
	page.on("request", (request) => {
		if (request.url().startsWith("https://graphql.anilist.co")) {
			browserAniListRequests.push(request.url())
		}
	})
	await page.route("https://graphql.anilist.co/**", async (route) => {
		await route.abort()
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
	await expect(page.getByRole("button", { name: "Search anime..." })).toBeVisible()
	const mainOverflow = await page.locator("#main-content").evaluate(element =>
		getComputedStyle(element).overflowY
	)
	expect(mainOverflow).toBe("auto")
	expect(browserAniListRequests).toEqual([])
})

test("a populated tier accepts another anime by drag and drop", async ({ page }) => {
	const tiers = [{
		id: "tier-e2e",
		name: "S",
		color: "#737373",
		range: [0, 100],
		entries: [tierlistEntry(1, "First anime")]
	}]

	await page.addInitScript((state) => {
		window.localStorage.setItem("tierlist", JSON.stringify(state))
	}, {
		currentTemplate: -1,
		tiers,
		unrankedTier: [tierlistEntry(2, "Second anime")],
		gapSize: 25,
		headingCorner: true,
		rowCorner: 6,
		colWidth: 0,
		selectedBackground: "bg-neutral-100",
		nbCol: 10
	})

	await page.goto("/tierlist", { waitUntil: "domcontentloaded" })

	const targetTier = page.locator('[data-tier-lane="tier-e2e"]')
	const sourceAnime = page.locator('[data-media-id="2"]')
	await expect(targetTier.locator(":scope > [data-tier-entry]")).toHaveCount(1)
	await expect(sourceAnime).toBeVisible()

	const sourceBox = await sourceAnime.boundingBox()
	const targetBox = await targetTier.boundingBox()
	expect(sourceBox).not.toBeNull()
	expect(targetBox).not.toBeNull()
	if (!sourceBox || !targetBox) return

	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2,
		sourceBox.y + sourceBox.height / 2
	)
	await page.mouse.down()
	await page.mouse.move(
		targetBox.x + Math.min(120, targetBox.width / 2),
		targetBox.y + targetBox.height / 2,
		{ steps: 12 }
	)
	await page.mouse.up()

	await expect(targetTier.locator(":scope > [data-tier-entry]")).toHaveCount(2)
	await expect(page.locator('[data-tier-lane="unranked"] > [data-tier-entry]')).toHaveCount(0)
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

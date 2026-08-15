import { expect, test } from "@playwright/test"

const COVER_BYTES = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6Y9Z2QAAAABJRU5ErkJggg==",
	"base64"
)

test("Create uses the selected AniList artwork without a file upload", async ({ page }) => {
	await page.route("**/api/search**", route => route.fulfill({
		contentType: "application/json",
		body: JSON.stringify({
			result: {
				predictions: [{ id: 1, title: "Cowboy Bebop" }]
			}
		})
	}))
	await page.route("**/api/anilist/media**", route => route.fulfill({
		contentType: "application/json",
		body: JSON.stringify({
			media: {
				id: 1,
				title: {
					english: "Cowboy Bebop",
					native: "カウボーイビバップ",
					romaji: "Cowboy Bebop",
					userPreferred: "Cowboy Bebop"
				},
				coverImage: {
					color: "#f59e0b",
					extraLarge: "/test-cover.png",
					large: "/test-cover.png",
					medium: "/test-cover.png"
				},
				trailer: {
					id: "test-trailer",
					site: "youtube",
					thumbnail: "/test-cover.png"
				},
				bannerImage: "/test-cover.png"
			}
		})
	}))
	await page.route("**/test-cover.png", route => route.fulfill({
		contentType: "image/png",
		body: COVER_BYTES
	}))

	await page.goto("/create")

	await expect(page.locator("canvas")).toBeVisible()
	await expect(page.locator('input[type="file"]')).toHaveCount(0)
	await page.getByRole("button", { name: "Select anime..." }).click()
	await page.getByPlaceholder("Search anime...").fill("Cowboy")
	await page.getByRole("button", { name: "Use Cowboy Bebop" }).click()

	await expect(page.getByRole("button", { name: "Cowboy Bebop" })).toBeVisible()
	await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("Cowboy Bebop")
	await expect(page.getByText("AniList cover selected")).toBeVisible()

	await page.getByRole("combobox", { name: "Anime title language" }).click()
	await page.getByRole("option", { name: "Native", exact: true }).click()
	await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("カウボーイビバップ")

	await page.getByRole("combobox", { name: "Anime artwork source" }).click()
	await page.getByRole("option", { name: "Banner", exact: true }).click()
	await expect(page.getByText("AniList banner selected")).toBeVisible()
	await expect(page.getByRole("button", { name: "Export" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Badge" })).toHaveCount(0)
})

import { expect, test } from "@playwright/test"

const username = "TimelineTester"
const now = Date.UTC(2026, 7, 15, 12) / 1_000

function animeActivity(index: number) {
	return {
		id: index,
		kind: "anime",
		createdAt: now - index * 45,
		replyCount: 0,
		type: "ANIME_LIST",
		user: {
			id: 42,
			name: username,
			avatar: null
		},
		status: "watched episode",
		progress: String(index),
		media: {
			id: 1_000 + index,
			title: {
				romaji: `Timeline anime ${index}`,
				english: `Timeline anime ${index}`,
				native: null,
				userPreferred: `Timeline anime ${index}`
			},
			coverImage: {
				color: index % 2 === 0 ? "#6366f1" : "#ec4899",
				large: "/og-default.svg",
				medium: "/og-default.svg"
			},
			format: "TV",
			siteUrl: `https://anilist.co/anime/${1_000 + index}`
		}
	}
}

test("the Gantt timeline stacks simultaneous anime inside a scrollable period", async ({ page }) => {
	await page.route("**/api/anilist/profile?**", async (route) => {
		await route.fulfill({
			json: {
				source: { mode: "public", username },
				profile: {
					id: 42,
					name: username,
					about: null,
					avatar: null,
					bannerImage: null,
					createdAt: now - 1_000,
					siteUrl: `https://anilist.co/user/${username}`,
					updatedAt: now,
					options: {
						displayAdultContent: false,
						profileColor: "blue",
						timezone: "Europe/Paris",
						titleLanguage: "ENGLISH"
					},
					mediaListOptions: {
						rowOrder: "score",
						scoreFormat: "POINT_100"
					}
				}
			}
		})
	})
	await page.route("**/api/anilist/activities?**", async (route) => {
		expect(new URL(route.request().url()).searchParams.get("kind")).toBe("anime")
		await route.fulfill({
			json: {
				source: { mode: "public", username },
				pageInfo: {
					currentPage: 1,
					hasNextPage: false,
					lastPage: 1,
					perPage: 20,
					total: 8
				},
				activities: Array.from({ length: 8 }, (_, index) => animeActivity(index + 1))
			}
		})
	})

	await page.goto("/login?redirect=/timeline")
	await page.getByLabel("AniList username").fill(username)
	await page.getByRole("button", { name: "Load public AniList profile" }).click()
	await expect(page).toHaveURL(/\/timeline$/)
	await expect(page.locator('[data-timeline-month="month-2026-08"]')).toBeVisible()
	await expect(page.locator("[data-timeline-activity]")).toHaveCount(8)

	await page.getByRole("tab", { name: "Gantt" }).click()

	const scrollArea = page.locator("[data-timeline-period-scroll-area]")
	const chartItems = scrollArea.locator("[data-gantt-timeline-chart] .item")
	await expect(scrollArea).toBeVisible()
	await expect(chartItems).toHaveCount(8)

	const viewport = scrollArea.locator("[data-reka-scroll-area-viewport]")
	const scrollMetrics = await viewport.evaluate((element) => ({
		clientHeight: element.clientHeight,
		clientWidth: element.clientWidth,
		scrollHeight: element.scrollHeight,
		scrollWidth: element.scrollWidth
	}))
	expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)
	expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth)

	const overlaps = await chartItems.evaluateAll((elements) => {
		const rectangles = elements.map(element => element.getBoundingClientRect())
		const collisions: Array<[number, number]> = []
		for (let left = 0; left < rectangles.length; left += 1) {
			for (let right = left + 1; right < rectangles.length; right += 1) {
				const first = rectangles[left]!
				const second = rectangles[right]!
				const overlapX = Math.min(first.right, second.right) - Math.max(first.left, second.left)
				const overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
				if (overlapX > 1 && overlapY > 1) collisions.push([left, right])
			}
		}
		return collisions
	})
	expect(overlaps).toEqual([])
})

import { expect, test, type Page } from "@playwright/test"
import type { CalendarApiResponse } from "../../app/types/calendar"
import { fixtureTitle, mockPublicProfile, openAs, submitPublicProfile } from "./fixtures/anilist"

// Every page below is reached by clicking the app's own navigation: a full document load would be
// rendered on the server, which cannot see these browser-side mocks and would forget the profile.

function primaryNavigation(page: Page) {
	return page.getByRole("navigation", { name: "Primary navigation" })
}

async function openFromNavigation(page: Page, label: string): Promise<void> {
	await primaryNavigation(page).getByRole("link", { name: label, exact: true }).click()
}

test("the dashboard shows the public profile's own list", async ({ page }) => {
	await mockPublicProfile(page, { username: "E2eAlpha" })
	await openAs(page, "E2eAlpha", "/")

	await expect(page.getByRole("heading", { name: "Welcome back, E2eAlpha" })).toBeVisible()
	await expect(page.getByText(/E2eAlpha anime \d+/).first()).toBeVisible()

	const overflow = await page.evaluate(() =>
		document.documentElement.scrollWidth - document.documentElement.clientWidth
	)
	expect(overflow).toBeLessThanOrEqual(1)
})

test("statistics list the genres of the mocked profile", async ({ page }) => {
	await mockPublicProfile(page, { username: "E2eAlpha" })
	await openAs(page, "E2eAlpha", "/")

	await openFromNavigation(page, "Statistics")

	await expect(page).toHaveURL(url => url.pathname === "/statistics")
	await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible()
	await expect(page.getByText("Mystery", { exact: true }).first()).toBeVisible()
})

test("Rewind opens on the current year and counts the mocked activities", async ({ page }) => {
	const calls = await mockPublicProfile(page, { username: "E2eAlpha" })
	await openAs(page, "E2eAlpha", "/")

	await openFromNavigation(page, "Rewind")

	const year = new Date().getUTCFullYear()
	await expect(page).toHaveURL(url => url.pathname === `/rewind/${year}`)
	await expect(page.getByRole("heading", { name: "Anime Rewind" })).toBeVisible()
	// The metric card renders its value in a span titled with that value, next to the card title.
	const listUpdates = page
		.getByText("List updates", { exact: true })
		.locator("xpath=ancestor::*[.//span[@title]][1]//span[@title]")
	// The fixture records four anime activities this year (one per watched entry, at most four).
	await expect(listUpdates).toHaveText("4")
	expect(calls.activities).toBeGreaterThan(0)
})

test("the podium ranks three anime of the mocked profile", async ({ page }) => {
	await mockPublicProfile(page, { username: "E2eAlpha" })
	await openAs(page, "E2eAlpha", "/")

	await openFromNavigation(page, "Podium")

	await expect(page).toHaveURL(url => url.pathname === "/podium")
	await expect(page.getByRole("heading", { name: "Podium" })).toBeVisible()
	await expect(page.locator("[data-podium-item]")).toHaveCount(3)
	await expect(page.getByRole("button", { name: /^Show details for E2eAlpha anime \d+$/ })).toHaveCount(3)
})

test("Explore reuses the loaded collection and settles without an error", async ({ page }) => {
	const requestedPaths: string[] = []
	page.on("request", (request) => {
		requestedPaths.push(new URL(request.url()).pathname)
	})
	const calls = await mockPublicProfile(page, { username: "E2eAlpha" })
	await openAs(page, "E2eAlpha", "/")
	await expect(page.getByText(/E2eAlpha anime \d+/).first()).toBeVisible()

	await openFromNavigation(page, "Explore")

	await expect(page).toHaveURL(url => url.pathname === "/explore")
	await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible()
	// The mocks return no suggestion, so the deck reaches its end state.
	await expect(page.getByText("You reached the end of this deck")).toBeVisible()
	await expect(page.getByText("Discovery data could not be loaded")).toHaveCount(0)
	await expect(page.getByText("Some suggestions could not be loaded")).toHaveCount(0)

	expect(calls.recommendations).toBeGreaterThan(0)
	expect(calls.studioMedia).toBeGreaterThan(0)
	// The Entries store caches the list per identity: Dashboard and Explore share one request.
	expect(calls.animeCollection).toBeLessThanOrEqual(1)
	expect(requestedPaths).not.toContain("/api/anilist/anime-list")
	expect(requestedPaths).not.toContain("/api/anilist/anime-list-ids")
})

test("switching to another public profile shows none of the previous profile's data", async ({ page }) => {
	await mockPublicProfile(page, { username: "E2eAlpha" })
	const betaCalls = await mockPublicProfile(page, { username: "E2eBeta" })
	await openAs(page, "E2eAlpha", "/podium")
	await expect(page.getByRole("button", { name: /^Show details for E2eAlpha anime \d+$/ }).first()).toBeVisible()

	await page.getByRole("button", { name: "Open account menu for E2eAlpha" }).click()
	await page.getByRole("menuitem", { name: "Clear profile" }).click()
	await expect(page).toHaveURL(url => url.pathname === "/login")

	await submitPublicProfile(page, "E2eBeta", "/podium")

	await expect(page.getByRole("button", { name: /^Show details for E2eBeta anime \d+$/ })).toHaveCount(3)
	await expect(page.getByText("E2eAlpha anime")).toHaveCount(0)
	await expect(page.getByRole("button", { name: /E2eAlpha/ })).toHaveCount(0)
	expect(betaCalls.animeCollection).toBe(1)
})

test("the calendar My list toggle keeps the Watching and Planning titles", async ({ page }) => {
	const calls = await mockPublicProfile(page, { username: "E2eAlpha" })
	// The first mocked profile owns media 4101 (completed), 4102 (watching) and 4103 (planning).
	const completed = fixtureTitle("E2eAlpha", 4_101)
	const watching = fixtureTitle("E2eAlpha", 4_102)
	const planning = fixtureTitle("E2eAlpha", 4_103)
	const offList = "E2E anime off the list"
	const today = new Date()
	const airingAt = (hour: number) =>
		Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour).getTime() / 1_000)
	const titles: Array<[number, string, number]> = [
		[4_101, completed, 9],
		[4_102, watching, 11],
		[4_103, planning, 13],
		[9_999, offList, 15]
	]
	// Each anime once under `media`; the airings refer to it by id.
	const calendar: CalendarApiResponse = {
		media: Object.fromEntries(titles.map(([id, title]) => [
			id,
			{ id, countryOfOrigin: "JP", duration: 24, format: "TV", title: { english: title, romaji: title } }
		])),
		airings: titles.map(([mediaId, , hour]) => ({ airingAt: airingAt(hour), episode: 6, mediaId })),
		simuldubs: [],
		warnings: []
	}
	await page.route(url => url.pathname === "/api/calendar", route => route.fulfill({ json: calendar }))
	await openAs(page, "E2eAlpha", "/")

	await openFromNavigation(page, "Calendar")

	await expect(page).toHaveURL(url => url.pathname === "/calendar")
	const toggle = page.getByRole("button", { name: "My list", exact: true })
	const eventOf = (title: string) => page.getByRole("button", { name: `${title}, episode 6` })
	await expect(toggle).toHaveAttribute("aria-pressed", "false")
	await expect(eventOf(completed)).toBeVisible()
	await expect(eventOf(offList)).toBeVisible()

	await toggle.click()

	await expect(toggle).toHaveAttribute("aria-pressed", "true")
	await expect(eventOf(watching)).toBeVisible()
	await expect(eventOf(planning)).toBeVisible()
	await expect(eventOf(completed)).toHaveCount(0)
	await expect(eventOf(offList)).toHaveCount(0)
	await expect(page.getByRole("button", { name: "Filter calendar events, filters active" })).toBeVisible()
	await expect(page.getByText("My list on, 2 events")).toBeAttached()
	expect(calls.animeCollection).toBeLessThanOrEqual(1)

	await toggle.click()

	await expect(toggle).toHaveAttribute("aria-pressed", "false")
	await expect(eventOf(completed)).toBeVisible()
	await expect(eventOf(offList)).toBeVisible()
	await expect(page.getByRole("button", { name: "Filter calendar events", exact: true })).toBeVisible()
})

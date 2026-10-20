import { expect, test } from "@playwright/test"

test("the public login remains keyboard-accessible on a mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })

	const response = await page.goto("/login", {
		waitUntil: "domcontentloaded"
	})

	expect(response?.ok()).toBe(true)
	await expect(page).toHaveTitle("Login | AniTools")
	await expect(page.getByRole("heading", { name: "Your AniList, with tools." })).toBeVisible()
	await expect(page.getByRole("button", { name: "Sign in with AniList" })).toBeVisible()
	await expect(page.getByRole("textbox", { name: "AniList username" })).toBeVisible()

	const overflow = await page.evaluate(() =>
		document.documentElement.scrollWidth - document.documentElement.clientWidth
	)
	expect(overflow).toBeLessThanOrEqual(1)

	await page.keyboard.press("Tab")
	const skipLink = page.getByRole("link", { name: "Skip to content" })
	await expect(skipLink).toBeFocused()
	await page.keyboard.press("Enter")
	await expect(page.locator("#main-content")).toBeFocused()
})

test("mobile visitors can open the navigation and reach another tool", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 })
	await page.goto("/support")

	const navbar = page.locator("[data-mobile-navbar]")
	await expect(navbar).toBeVisible()
	await expect(navbar).toContainText("Support")

	const drawer = page.getByRole("dialog", { name: "Navigation" })
	// The dev server can still be hydrating when the first click lands; retry until it opens.
	await expect(async () => {
		await navbar.getByRole("button", { name: "Open navigation" }).click()
		await expect(drawer).toBeVisible({ timeout: 1_000 })
	}).toPass()
	await drawer.getByRole("link", { name: "Tierlist" }).click()

	await expect(page).toHaveURL(/\/tierlist$/)
	await expect(navbar).toContainText("Tierlist")
})

test("the login points guests to the tools that need no account", async ({ page }) => {
	await page.goto("/login")

	await page.getByRole("link", { name: "Calendar" }).click()
	await expect(page).toHaveURL(/\/calendar$/)
})

test("an unknown public profile is reported next to the username field", async ({ page }) => {
	await page.route("**/api/anilist/profile?**", route => route.fulfill({
		status: 404,
		json: { statusCode: 404, statusMessage: "AniList user was not found" }
	}))
	await page.goto("/login")

	const field = page.getByRole("textbox", { name: "AniList username" })
	await field.fill("nobody-here")
	await page.getByRole("button", { name: "Load public AniList profile" }).click()

	await expect(page.getByRole("alert")).toContainText("no public profile called \"nobody-here\"")
	await expect(field).toHaveAttribute("aria-invalid", "true")
	await expect(field).toBeFocused()
})

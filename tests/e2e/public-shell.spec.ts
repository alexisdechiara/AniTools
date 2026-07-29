import { expect, test } from "@playwright/test"

test("the public login remains keyboard-accessible on a mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })

	const response = await page.goto("/login", {
		waitUntil: "domcontentloaded"
	})

	expect(response?.ok()).toBe(true)
	await expect(page).toHaveTitle("Login | AniTools")
	await expect(page.getByRole("heading", { name: "AniTools" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Continue with AniList" })).toBeVisible()
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

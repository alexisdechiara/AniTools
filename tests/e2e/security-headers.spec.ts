import { expect, test } from "@playwright/test"

test("pages are served with the security headers", async ({ page }) => {
	const response = await page.request.get("/login")
	expect(response.ok()).toBe(true)

	const headers = response.headers()
	expect(headers["x-frame-options"]).toBe("DENY")
	expect(headers["x-content-type-options"]).toBe("nosniff")
	expect(headers["cross-origin-opener-policy"]).toBe("same-origin")
	expect(headers["content-security-policy"]).toContain("default-src 'self'")
	expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
})

test("the production policy does not allow eval", async ({ page }) => {
	test.skip(process.env.PLAYWRIGHT_TARGET !== "build", "production policy only")

	const response = await page.request.get("/login")
	expect(response.ok()).toBe(true)
	expect(response.headers()["content-security-policy"]).not.toContain("'unsafe-eval'")
})

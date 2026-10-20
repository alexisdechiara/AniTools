import { defineConfig, devices } from "@playwright/test"

const port = 4173
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI
		? [
				["github"],
				["html", { open: "never", outputFolder: "playwright-report" }]
			]
		: [["list"]],
	outputDir: "test-results",
	// The suite runs against `nuxt dev`: the first visit to a page compiles it, which can
	// exceed the 5s default when every worker hits a cold page at once.
	expect: {
		timeout: 10_000
	},
	use: {
		baseURL,
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
		video: "retain-on-failure"
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"]
			}
		}
	],
	webServer: {
		command: `bun run dev --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})

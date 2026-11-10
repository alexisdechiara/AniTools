import { defineConfig, devices } from "@playwright/test"

const port = 4173
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`
// `PLAYWRIGHT_TARGET=build` runs the suite against the built server (`bun run test:e2e:build`),
// which applies the production Content-Security-Policy; anything else runs it against `nuxt dev`.
const target = process.env.PLAYWRIGHT_TARGET === "build" ? "build" : "dev"

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
	// In dev mode the first visit to a page compiles it, which can exceed the 5s default when
	// every worker hits a cold page at once; the built server keeps the same budget.
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
	webServer: target === "build"
		? {
				command: "node .output/server/index.mjs",
				url: baseURL,
				reuseExistingServer: false,
				timeout: 60_000,
				env: {
					HOST: "127.0.0.1",
					PORT: String(port),
					NODE_ENV: "production",
					NUXT_SITE_URL: baseURL
				}
			}
		: {
				command: `bun run dev --host 127.0.0.1 --port ${port}`,
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 120_000
			}
})

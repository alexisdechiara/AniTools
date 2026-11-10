import { fileURLToPath } from "node:url"
import { defineVitestProject } from "@nuxt/test-utils/config"
import { defineConfig } from "vitest/config"

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url))
const appRoot = fileURLToPath(new URL("./app", import.meta.url))

export default defineConfig({
	test: {
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json-summary", "html"],
			reportsDirectory: "coverage",
			include: [
				"app/utils/**/*.ts",
				"server/utils/**/*.ts",
				"app/stores/**/*.ts",
				"app/composables/**/*.ts",
				"app/middleware/**/*.ts",
				"shared/**/*.ts"
			],
			exclude: ["app/utils/tierlist-data.ts", "app/utils/tierlist-templates.ts"]
		},
		projects: [
			{
				extends: true,
				resolve: {
					alias: { "~": appRoot, "@": appRoot, "~~": repositoryRoot, "@@": repositoryRoot }
				},
				test: {
					name: "unit",
					environment: "node",
					exclude: ["tests/e2e/**", "node_modules/**", ".nuxt/**", ".output/**"],
					include: ["tests/unit/**/*.test.ts"]
				}
			},
			await defineVitestProject({
				extends: true,
				test: {
					name: "nuxt",
					environment: "nuxt",
					include: ["tests/nuxt/**/*.test.ts"],
					// Booting the Nuxt app happens in a beforeAll hook; a cold transform can exceed 10 s.
					hookTimeout: 60_000,
					environmentOptions: {
						nuxt: {
							domEnvironment: "happy-dom"
						}
					}
				}
			})
		]
	}
})

import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url))
const appRoot = fileURLToPath(new URL("./app", import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			"~": appRoot,
			"@": appRoot,
			"~~": repositoryRoot,
			"@@": repositoryRoot
		}
	},
	test: {
		clearMocks: true,
		environment: "node",
		exclude: [
			"tests/e2e/**",
			"node_modules/**",
			".nuxt/**",
			".output/**"
		],
		include: ["tests/unit/**/*.test.ts"],
		mockReset: true,
		restoreMocks: true,
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json-summary", "html"],
			reportsDirectory: "coverage",
			include: [
				"app/utils/**/*.ts",
				"server/utils/**/*.ts"
			],
			exclude: [
				"app/utils/tierlist-data.ts",
				"app/utils/tierlist-templates.ts"
			]
		}
	}
})

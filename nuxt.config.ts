// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
				modules: [
				 "@nuxt/eslint",
				 "@nuxt/ui",
				 "@vueuse/nuxt",
				 "nuxt-charts",
				 "@nuxt/image"
				],

				components: [
								{
												path: "~/components",
												pathPrefix: false }
				],

				devtools: {
								enabled: true
				},

				css: ["~/assets/css/main.css"],

				routeRules: {
								"/api/**": {
												cors: true
								}
				},

				compatibilityDate: "2024-07-11",

				eslint: {
								config: {
												stylistic: {
																commaDangle: "never",
																braceStyle: "1tbs",
																semi: false,
																indent: "tab",
																quotes: "double"
												}
								}
				}
})
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: [
		"@nuxt/eslint",
		"@nuxt/ui",
		"@vueuse/nuxt",
		"nuxt-charts",
		"@nuxt/image",
		"@pinia/nuxt",
		"nuxt-graphql-client",
		"pinia-plugin-persistedstate/nuxt",
		"@nuxtjs/mdc",
	],

	components: [
		{
			path: "~/components",
			pathPrefix: false
		}
	],

	devtools: {
		enabled: true
	},

	css: ["~/assets/css/main.css"],

	runtimeConfig: {
		public: {
			GQL_HOST: "https://graphql.anilist.co",
		}
	},

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
	},

	icon: {
		customCollections: [
			{
				prefix: "custom",
				dir: "./app/assets/icons",
				recursive: true
			}
		]
	}
})

export default defineNuxtConfig({
	"compatibilityDate": "2026-07-29",

	"components": [
		{
			path: "~/components",
			pathPrefix: false
		}
	],

	"css": ["~/assets/css/main.css"],

	"devtools": {
		enabled: process.env.NODE_ENV !== "production"
	},

	"eslint": {
		config: {
			stylistic: false
		}
	},

	"graphql-client": {
		clients: {
			default: {
				host: process.env.NUXT_PUBLIC_ANILIST_URL || "https://graphql.anilist.co",
				proxyCookies: false
			}
		}
	},

	"icon": {
		customCollections: [
			{
				prefix: "custom",
				dir: "./app/assets/icons",
				recursive: true
			}
		]
	},
	"modules": [
		"@nuxt/eslint",
		"@nuxt/ui",
		"@vueuse/nuxt",
		"@nuxt/image",
		"nuxt-site-config",
		"@nuxtjs/robots",
		"@nuxtjs/sitemap",
		"@pinia/nuxt",
		"nuxt-graphql-client",
		"pinia-plugin-persistedstate/nuxt"
	],

	"robots": {
		metaTag: false,
		sitemap: ["/sitemap.xml"],
		allow: ["/calendar", "/tierlist"],
		disallow: ["/login", "/settings", "/statistics", "/customers", "/inbox", "/rewind"]
	},

	"routeRules": {
		"/**": {
			headers: {
				"X-Frame-Options": "DENY",
				"X-Content-Type-Options": "nosniff",
				"Referrer-Policy": "strict-origin-when-cross-origin",
				"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
				"Cross-Origin-Opener-Policy": "same-origin"
			}
		},
		"/api/calendar": {
			swr: 60,
			headers: {
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
			}
		},
		"/api/search": {
			swr: 300,
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
			}
		},
		"/api/auth/**": {
			headers: {
				"Cache-Control": "private, no-store"
			}
		},
		"/auth/**": {
			headers: {
				"Cache-Control": "private, no-store"
			}
		}
	},

	"runtimeConfig": {
		anilist: {
			clientId: "",
			clientSecret: "",
			redirectUri: ""
		},
		sessionPassword: "",
		public: {
			anilistUrl: "https://graphql.anilist.co",
			directusUrl: "https://api.anitools.geekly.blog"
		}
	},

	"site": {
		name: "AniTools",
		description: "Anime tracking tools, calendar and tier list.",
		defaultLocale: "en"
	},

	"sitemap": {
		autoLastmod: true,
		defaults: {
			changefreq: "weekly",
			priority: 0.7
		},
		include: ["/calendar", "/tierlist", "/"]
	}
})

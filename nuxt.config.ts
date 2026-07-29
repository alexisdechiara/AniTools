const isProduction = process.env.NODE_ENV === "production"
const contentSecurityPolicy = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	`script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	"img-src 'self' data: blob: https://s4.anilist.co",
	"media-src 'self' blob:",
	`connect-src 'self' https://api.anitools.geekly.blog${isProduction ? "" : " http: ws: wss:"}`,
	"frame-src https://www.youtube-nocookie.com https://www.youtube.com",
	"worker-src 'self' blob:"
].join("; ")

const securityHeaders: Record<string, string> = {
	"Content-Security-Policy": contentSecurityPolicy,
	"Cross-Origin-Opener-Policy": "same-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY"
}

if (isProduction) {
	securityHeaders["Strict-Transport-Security"] = "max-age=31536000"
}

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

	"image": {
		domains: ["s4.anilist.co"]
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
		"pinia-plugin-persistedstate/nuxt"
	],

	"robots": {
		metaTag: false,
		sitemap: ["/sitemap.xml"],
		allow: ["/calendar", "/tierlist"],
		disallow: ["/create", "/explore", "/login", "/statistics", "/rewind", "/timeline"]
	},

	"routeRules": {
		"/**": {
			headers: securityHeaders
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
				"Cache-Control": "private, no-store",
				"Referrer-Policy": "no-referrer"
			}
		}
	},

	"runtimeConfig": {
		anilist: {
			clientId: "",
			clientSecret: "",
			redirectUri: ""
		},
		siteUrl: "",
		sessionPassword: "",
		sessionPreviousPassword: "",
		public: {
			directusUrl: "https://api.anitools.geekly.blog"
		}
	},

	"site": {
		name: "AniTools",
		description: "Explore anime releases and turn AniList data into calendars, statistics, rewinds and tier lists.",
		defaultLocale: "en"
	},

	"sitemap": {
		autoLastmod: true,
		defaults: {
			changefreq: "weekly",
			priority: 0.7
		},
		include: ["/calendar", "/tierlist"]
	}
})

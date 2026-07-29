<script setup lang="ts">
import {
	normalizeSiteUrl,
	serializeJsonLd
} from "~/utils/seo"

const colorMode = useColorMode()
const route = useRoute()
const site = useSiteConfig()

const color = computed(() => (colorMode.value === "dark" ? "#1b1718" : "white"))
const siteUrl = computed(() => normalizeSiteUrl(site.url))
const canonicalUrl = computed(() => `${siteUrl.value}${route.path}`)
const ogImageUrl = computed(() => `${siteUrl.value}/og-default.svg`)
const seo = {
	title: "AniTools",
	description: "Explore anime releases and turn AniList data into calendars, statistics, rewinds and tier lists."
}
const websiteSchema = computed(() =>
	serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "AniTools",
		url: siteUrl.value
	})
)
const appSchema = computed(() =>
	serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: "AniTools",
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "Any",
		url: siteUrl.value
	})
)

useHead(() => ({
	meta: [
		{ charset: "utf-8" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" },
		{ key: "theme-color", name: "theme-color", content: color.value }
	],
	link: [
		{ rel: "icon", href: "/favicon.ico" },
		{ rel: "canonical", href: canonicalUrl.value }
	],
	script: [
		{ key: "ld-website", type: "application/ld+json", innerHTML: websiteSchema.value },
		{ key: "ld-webapp", type: "application/ld+json", innerHTML: appSchema.value }
	],
	titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | AniTools` : "AniTools"),
	htmlAttrs: {
		lang: "en"
	}
}))

useSeoMeta({
	title: seo.title,
	description: seo.description,
	ogSiteName: "AniTools",
	ogType: "website",
	ogUrl: () => canonicalUrl.value,
	ogTitle: seo.title,
	ogDescription: seo.description,
	ogImage: () => ogImageUrl.value,
	twitterCard: "summary_large_image",
	twitterTitle: seo.title,
	twitterDescription: seo.description,
	twitterImage: () => ogImageUrl.value,
	robots: () => route.meta.indexable === false
		? "noindex, nofollow"
		: "index, follow"
})
</script>

<template>
	<UApp>
		<a
			href="#main-content"
			class="fixed left-3 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 font-medium text-inverted shadow-lg transition-transform focus:translate-y-0">
			Skip to content
		</a>
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>

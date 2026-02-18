<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const site = useSiteConfig()

const color = computed(() => (colorMode.value === "dark" ? "#1b1718" : "white"))
const siteUrl = computed(() => String(site.url || "https://anitools.vercel.app").replace(/\/+$/, ""))
const canonicalUrl = computed(() => `${siteUrl.value}${route.path}`)
const ogImageUrl = computed(() => `${siteUrl.value}/og-default.svg`)
const seo = {
	title: "AniTools",
	description: "Anime tracking tools, calendar and tier list."
}
const websiteSchema = computed(() =>
	JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "AniTools",
		url: siteUrl.value,
		potentialAction: {
			"@type": "SearchAction",
			target: `${siteUrl.value}/calendar`,
			"query-input": "required name=search_term_string"
		}
	})
)
const appSchema = computed(() =>
	JSON.stringify({
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
		{ key: "ld-website", type: "application/ld+json", children: websiteSchema.value },
		{ key: "ld-webapp", type: "application/ld+json", children: appSchema.value }
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
	ogTitle: seo.title,
	ogDescription: seo.description,
	ogImage: () => ogImageUrl.value,
	twitterCard: "summary_large_image",
	twitterTitle: seo.title,
	twitterDescription: seo.description,
	twitterImage: () => ogImageUrl.value
})
</script>

<template>
	<UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

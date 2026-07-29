<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-tags",
	auth: FEATURE_REGISTRY["statistics-tags"].access,
	indexable: FEATURE_REGISTRY["statistics-tags"].indexable
})
</script>

<template>
	<StatisticsDimensionPage
		page-id="statistics-tags"
		title="Tags"
		description="Explore the themes and traits that appear across your AniList anime history."
		dimension="tags"/>
</template>

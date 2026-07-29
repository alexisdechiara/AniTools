<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-genres",
	auth: FEATURE_REGISTRY["statistics-genres"].access,
	indexable: FEATURE_REGISTRY["statistics-genres"].indexable
})
</script>

<template>
	<StatisticsDimensionPage
		page-id="statistics-genres"
		title="Genres"
		description="Compare the genres in your anime list by title count, mean score or watch time."
		dimension="genres"/>
</template>

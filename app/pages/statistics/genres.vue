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
		dimension="genres"/>
</template>

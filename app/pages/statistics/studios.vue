<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-studios",
	auth: FEATURE_REGISTRY["statistics-studios"].access,
	indexable: FEATURE_REGISTRY["statistics-studios"].indexable
})
</script>

<template>
	<StatisticsDimensionPage
		page-id="statistics-studios"
		dimension="studios"/>
</template>

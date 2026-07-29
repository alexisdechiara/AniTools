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
		title="Studios"
		description="See which animation studios define your list and how their titles compare."
		dimension="studios"/>
</template>

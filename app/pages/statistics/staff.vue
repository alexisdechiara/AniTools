<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-staff",
	auth: FEATURE_REGISTRY["statistics-staff"].access,
	indexable: FEATURE_REGISTRY["statistics-staff"].indexable
})
</script>

<template>
	<StatisticsPeoplePage
		page-id="statistics-staff"
		title="Staff"
		description="Explore the directors, writers and other staff represented across your anime list."
		kind="staff"/>
</template>

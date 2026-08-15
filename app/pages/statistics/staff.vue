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
		kind="staff"/>
</template>

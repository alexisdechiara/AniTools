<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-staff",
	auth: FEATURE_REGISTRY["statistics-staff"].access,
	indexable: FEATURE_REGISTRY["statistics-staff"].indexable
})
</script>

<template>
	<StatisticsUnavailablePage
		page-id="statistics-staff"
		title="Staff"
		description="A future ranking of directors, writers and other staff behind your list."
		required-data="The current allowlisted AniList response does not fetch media staff connections. This page stays explicit until a paginated, cached server query can supply complete credits."/>
</template>

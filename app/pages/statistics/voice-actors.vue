<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-voice-actors",
	auth: FEATURE_REGISTRY["statistics-voice-actors"].access,
	indexable: FEATURE_REGISTRY["statistics-voice-actors"].indexable
})
</script>

<template>
	<StatisticsUnavailablePage
		page-id="statistics-voice-actors"
		title="Voice Actors"
		description="A future ranking of voice actors represented in your watched anime."
		required-data="The current AniList statistics response does not include voice actor roles. A bounded staff query and aggregation cache are required before this ranking can be accurate."/>
</template>

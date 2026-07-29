<script setup lang="ts">
import { FEATURE_REGISTRY } from "#shared/config/features"

definePageMeta({
	feature: "statistics-voice-actors",
	auth: FEATURE_REGISTRY["statistics-voice-actors"].access,
	indexable: FEATURE_REGISTRY["statistics-voice-actors"].indexable
})
</script>

<template>
	<StatisticsPeoplePage
		page-id="statistics-voice-actors"
		title="Voice Actors"
		description="See which voice actors appear most across your AniList anime history."
		kind="voiceActors"/>
</template>

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
		kind="voiceActors"/>
</template>

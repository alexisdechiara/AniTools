<script setup lang="ts">
import RewindAnimeRankingCard from "~/components/rewind/AnimeRankingCard.vue"
import RewindBreakdownCard from "~/components/rewind/BreakdownCard.vue"
import RewindHighlightsCard from "~/components/rewind/HighlightsCard.vue"
import { buildAllTimeRewindSummary } from "~/utils/dashboard-rewind"

defineOptions({ inheritAttrs: false })

const props = defineProps<{
	variant: "flop" | "highlights" | "seasons" | "top"
}>()

const { getAllAnimes } = storeToRefs(useEntriesStore())
const summary = computed(() => buildAllTimeRewindSummary(getAllAnimes.value))
</script>

<template>
	<RewindBreakdownCard
		v-if="props.variant === 'seasons'"
		v-bind="$attrs"
		title="Anime by season · All time"
		:items="summary.seasons"
		:limit="4"
		empty-label="No watched anime with a season is available." />
	<RewindHighlightsCard
		v-else-if="props.variant === 'highlights'"
		v-bind="$attrs"
		:selection="summary.highlight"
		:longest="summary.longestAnime"
		selection-label="All-time selection"
		empty-label="No all-time highlight is available." />
	<RewindAnimeRankingCard
		v-else-if="props.variant === 'top'"
		v-bind="$attrs"
		title="Top 3 anime · All time"
		:items="summary.topAnime"
		empty-label="No scored anime is available." />
	<RewindAnimeRankingCard
		v-else
		v-bind="$attrs"
		title="Flop 3 anime · All time"
		:items="summary.flopAnime"
		variant="flop"
		empty-label="No scored anime is available." />
</template>

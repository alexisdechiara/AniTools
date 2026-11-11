<script lang="ts" setup>
import HighlightCarousel, {
	type HighlightCarouselItem
} from "~/components/cards/HighlightCarousel.vue"
import { getMediaCover } from "~/utils/media-display"
import { getEntryWatchMinutes } from "~/utils/statistics"

const { getBestScoreAnime, getLongestAnime, getMostWatchedAnime } = storeToRefs(
	useStatisticsStore()
)

const { format: formatScore } = usePersonalScore()
const { title: getAnimeTitle } = useMediaTitle()

const highlights = computed<HighlightCarouselItem[]>(() => {
	const items: HighlightCarouselItem[] = []
	const bestScore = getBestScoreAnime.value
	const longest = getLongestAnime.value
	const mostRewatched = getMostWatchedAnime.value

	if (bestScore?.media) {
		items.push({
			key: "best-rated",
			label: "Best rated anime",
			title: getAnimeTitle(bestScore.media),
			cover: getMediaCover(bestScore.media, "medium"),
			value: bestScore.score ? formatScore(bestScore.score) : null
		})
	}

	if (longest?.media) {
		items.push({
			key: "longest",
			label: "Longest watch time",
			title: getAnimeTitle(longest.media),
			cover: getMediaCover(longest.media, "medium"),
			value: formatWatchTime(getEntryWatchMinutes(longest))
		})
	}

	if (mostRewatched?.media) {
		const repeats = mostRewatched.repeat ?? 0
		items.push({
			key: "most-rewatched",
			label: "Most rewatched anime",
			title: getAnimeTitle(mostRewatched.media),
			cover: getMediaCover(mostRewatched.media, "medium"),
			value: `${repeats} ${repeats === 1 ? "time" : "times"}`
		})
	}

	return items
})
</script>

<template>
	<MetricsCard v-bind="$attrs">
		<HighlightCarousel
			:items="highlights"
			empty-label="No highlight yet. Score or finish a few anime on AniList to see them here." />
	</MetricsCard>
</template>

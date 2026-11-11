<script setup lang="ts">
import HighlightCarousel, {
	type HighlightCarouselItem
} from "~/components/cards/HighlightCarousel.vue"
import { getMediaCover } from "~/utils/media-display"
import type { RewindAnimeMetric } from "~/utils/rewind"
import { getRewindSelectionKind } from "~/utils/rewind-display"
import { formatWatchTime } from "~/utils/formatTime"

const props = defineProps<{
	emptyLabel?: string
	selection: RewindAnimeMetric | null
	/** Label of the highest-rated title. Unscored selections are always the longest watch. */
	selectionLabel?: string
	longest: RewindAnimeMetric | null
}>()

const { format: formatScore } = usePersonalScore()
const { title: getAnimeTitle } = useMediaTitle()

function toItem(
	key: string,
	label: string,
	item: RewindAnimeMetric,
	value: string
): HighlightCarouselItem {
	return {
		key,
		label,
		title: getAnimeTitle(item.entry.media ?? { id: item.entry.id }),
		cover: getMediaCover(item.entry.media, "medium"),
		value
	}
}

const highlights = computed<HighlightCarouselItem[]>(() => {
	const result: HighlightCarouselItem[] = []
	const kind = getRewindSelectionKind(props.selection)

	if (props.selection && kind === "highest-rated") {
		result.push(toItem(
			"selection",
			props.selectionLabel ?? "Highest rated",
			props.selection,
			formatScore(props.selection.entry.score)
		))
	}
	// Without any scored title the selection is the longest watch: show it once, as such.
	const longest = kind === "longest-watch" ? props.selection : props.longest
	if (
		longest
		&& (kind !== "highest-rated"
			|| longest.entry.media?.id !== props.selection?.entry.media?.id)
	) {
		result.push(toItem(
			"longest",
			"Longest watch",
			longest,
			formatWatchTime(longest.minutesWatched)
		))
	}

	return result
})
</script>

<template>
	<MetricsCard v-bind="$attrs">
		<HighlightCarousel
			:items="highlights"
			:empty-label="emptyLabel ?? 'No highlight is available for this year.'" />
	</MetricsCard>
</template>

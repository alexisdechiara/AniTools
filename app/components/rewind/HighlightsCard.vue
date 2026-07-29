<script setup lang="ts">
import type { RewindAnimeMetric } from "~/utils/rewind"
import { formatWatchTime } from "~/utils/formatTime"

const props = defineProps<{
	selection: RewindAnimeMetric | null
	longest: RewindAnimeMetric | null
}>()

interface Highlight {
	label: string
	item: RewindAnimeMetric
	value: string
}

const highlights = computed<Highlight[]>(() => {
	const result: Highlight[] = []

	if (props.selection) {
		result.push({
			label: "Selection of the year",
			item: props.selection,
			value: `${props.selection.entry.score || "—"}/100`
		})
	}
	if (
		props.longest
		&& props.longest.entry.media?.id !== props.selection?.entry.media?.id
	) {
		result.push({
			label: "Longest watch",
			item: props.longest,
			value: formatWatchTime(props.longest.minutesWatched)
		})
	}

	return result
})

function getTitle(item: RewindAnimeMetric): string {
	return item.entry.media?.title?.userPreferred
		|| item.entry.media?.title?.english
		|| item.entry.media?.title?.romaji
		|| `Anime #${item.entry.media?.id ?? item.entry.id}`
}

function getCover(item: RewindAnimeMetric): string | undefined {
	return item.entry.media?.coverImage?.extraLarge
		|| item.entry.media?.coverImage?.large
		|| item.entry.media?.coverImage?.medium
		|| undefined
}
</script>

<template>
	<MetricsCard title="Highlights" v-bind="$attrs">
		<div v-if="highlights.length" class="mt-3 grid gap-4 sm:grid-cols-2">
			<article
				v-for="highlight in highlights"
				:key="highlight.label"
				class="flex min-w-0 gap-3 rounded-lg bg-elevated/60 p-3">
				<NuxtImg
					v-if="getCover(highlight.item)"
					:src="getCover(highlight.item)"
					:alt="getTitle(highlight.item)"
					class="h-24 w-16 shrink-0 rounded-md object-cover" />
				<div class="min-w-0">
					<p class="text-xs font-medium tracking-wide text-primary uppercase">
						{{ highlight.label }}
					</p>
					<p class="mt-1 line-clamp-2 text-sm font-semibold text-highlighted">
						{{ getTitle(highlight.item) }}
					</p>
					<p class="mt-2 text-lg font-bold text-highlighted">
						{{ highlight.value }}
					</p>
				</div>
			</article>
		</div>
		<p v-else class="mt-4 text-sm text-muted">
			No highlight is available for this year.
		</p>
	</MetricsCard>
</template>

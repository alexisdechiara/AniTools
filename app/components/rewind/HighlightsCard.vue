<script setup lang="ts">
import type { RewindAnimeMetric } from "~/utils/rewind"
import { formatWatchTime } from "~/utils/formatTime"

const props = defineProps<{
	emptyLabel?: string
	selection: RewindAnimeMetric | null
	selectionLabel?: string
	longest: RewindAnimeMetric | null
}>()

interface Highlight {
	label: string
	item: RewindAnimeMetric
	value: string
}

const currentIndex = ref(0)

const highlights = computed<Highlight[]>(() => {
	const result: Highlight[] = []

	if (props.selection) {
		result.push({
			label: props.selectionLabel ?? "Selection of the year",
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

watch(highlights, (items) => {
	if (currentIndex.value >= items.length) {
		currentIndex.value = Math.max(0, items.length - 1)
	}
})

function indexToRotate(index: number): string {
	switch (index) {
		case 0:
			return "rotate-[3deg] z-30"
		case 1:
			return "-rotate-[6deg] z-20"
		default:
			return "rotate-[1deg] z-10"
	}
}

const currentHighlight = computed(() => highlights.value[currentIndex.value])
</script>

<template>
	<MetricsCard v-bind="$attrs">
		<div v-if="highlights.length" class="grid min-h-52 grid-cols-13 gap-x-6">
			<div class="relative col-span-6 flex size-full max-w-50 items-center justify-center">
				<NuxtImg
					v-for="(highlight, index) in highlights"
					v-show="index >= currentIndex"
					:key="highlight.label"
					:src="getCover(highlight.item)"
					:alt="getTitle(highlight.item)"
					class="absolute aspect-3/4 h-fit w-full scale-90 rounded-lg object-cover transition-all"
					:class="indexToRotate(index)"
					:data-current="index === currentIndex ? '' : undefined" />
			</div>
			<div class="relative col-span-7 flex size-full min-w-0 flex-col gap-y-3">
				<span class="text-xs font-medium text-toned capitalize">
					{{ currentHighlight?.label }}
				</span>
				<span class="text-2xl font-semibold text-pretty text-highlighted">
					{{ currentHighlight ? getTitle(currentHighlight.item) : "" }}
				</span>
				<span class="text-4xl font-bold text-highlighted">
					{{ currentHighlight?.value }}
				</span>
				<div class="absolute top-0 right-0 flex h-fit gap-x-3">
					<UButton
						icon="i-lucide-chevron-left"
						size="xs"
						color="neutral"
						variant="link"
						aria-label="Previous highlight"
						:disabled="currentIndex === 0"
						:ui="{ base: 'cursor-pointer p-0' }"
						@click="currentIndex > 0 && currentIndex--" />
					<UButton
						icon="i-lucide-chevron-right"
						size="xs"
						color="neutral"
						variant="link"
						aria-label="Next highlight"
						:disabled="currentIndex >= highlights.length - 1"
						:ui="{ base: 'cursor-pointer p-0' }"
						@click="currentIndex < highlights.length - 1 && currentIndex++" />
				</div>
			</div>
		</div>
		<p v-else class="mt-4 text-sm text-muted">
			{{ emptyLabel ?? "No highlight is available for this year." }}
		</p>
	</MetricsCard>
</template>

<style scoped>
img[data-current] {
	animation: pulsing-jiggle 0.2s ease-in-out both;
}

@keyframes pulsing-jiggle {
	0%, 100% {
		transform: rotate(0deg) scale(1);
	}

	25%, 75% {
		transform: rotate(1deg) scale(1.025);
	}

	50% {
		transform: rotate(0deg) scale(1.05);
	}
}
</style>

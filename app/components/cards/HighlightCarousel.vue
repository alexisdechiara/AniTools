<script setup lang="ts">
/**
 * The stacked-cover carousel shared by the Statistics highlight card and the Rewind
 * highlights card: one highlight at a time, with previous and next buttons.
 */
export interface HighlightCarouselItem {
	/** Stable identity of the slide, also used as the list key. */
	key: string
	/** What the highlight is, e.g. "Longest watch". */
	label: string
	/** The anime title. */
	title: string
	/** The headline value, already formatted. `null` when AniList has none. */
	value: string | null
	cover?: string | null
}

const props = withDefaults(defineProps<{
	items: readonly HighlightCarouselItem[]
	emptyLabel?: string
}>(), {
	emptyLabel: "No highlight is available yet."
})

const currentIndex = ref(0)
const current = computed(() => props.items[currentIndex.value])

watch(() => props.items, (items) => {
	if (currentIndex.value >= items.length) {
		currentIndex.value = Math.max(0, items.length - 1)
	}
})

function previous(): void {
	if (currentIndex.value > 0) currentIndex.value -= 1
}

function next(): void {
	if (currentIndex.value < props.items.length - 1) currentIndex.value += 1
}

function stackClass(index: number): string {
	if (index === 0) return "rotate-[3deg] z-30"
	if (index === 1) return "-rotate-[6deg] z-20"
	return "rotate-[1deg] z-10"
}

// 24px targets with a fine pointer, 44px on touch screens (WCAG 2.5.8).
const navButtonUi = {
	base: "size-6 cursor-pointer justify-center p-0 pointer-coarse:size-11"
}
</script>

<template>
	<div v-if="items.length" class="grid min-h-52 grid-cols-13 gap-x-6">
		<div class="relative col-span-6 flex size-full max-w-50 items-center justify-center">
			<template v-for="(item, index) in items" :key="item.key">
				<NuxtImg
					v-if="item.cover"
					v-show="index >= currentIndex"
					:src="item.cover"
					:alt="`${item.title} cover`"
					width="200"
					height="267"
					fit="cover"
					format="webp"
					loading="lazy"
					class="absolute aspect-3/4 h-fit w-full scale-90 rounded-lg object-cover transition-[scale,translate,opacity]"
					:class="stackClass(index)"
					:data-current="index === currentIndex ? '' : undefined" />
			</template>
		</div>
		<div class="relative col-span-7 flex size-full min-w-0 flex-col gap-y-3">
			<span class="pe-16 text-xs font-medium text-pretty text-toned pointer-coarse:pe-24">
				{{ current?.label }}
			</span>
			<span class="text-2xl font-semibold text-pretty text-highlighted">
				{{ current?.title }}
			</span>
			<span v-if="current?.value" class="text-4xl font-bold text-highlighted tabular-nums">
				{{ current.value }}
			</span>
			<span v-else class="text-sm text-muted">No value recorded on AniList.</span>
			<div class="absolute top-0 right-0 flex h-fit gap-x-1">
				<UButton
					icon="i-lucide-chevron-left"
					size="xs"
					color="neutral"
					variant="link"
					aria-label="Previous highlight"
					:disabled="currentIndex === 0"
					:ui="navButtonUi"
					@click="previous" />
				<UButton
					icon="i-lucide-chevron-right"
					size="xs"
					color="neutral"
					variant="link"
					aria-label="Next highlight"
					:disabled="currentIndex >= items.length - 1"
					:ui="navButtonUi"
					@click="next" />
			</div>
		</div>
	</div>
	<div v-else class="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
		<UIcon name="i-lucide-sparkles" class="size-7 text-muted" aria-hidden="true" />
		<p class="text-sm text-muted">
			{{ emptyLabel }}
		</p>
	</div>
</template>

<style scoped>
img[data-current] {
	animation: pulsing-jiggle 0.2s ease-in-out both;
}

@keyframes pulsing-jiggle {
	0%, 100% {
		transform: rotate(0deg) scale(1);
	}

	25% {
		transform: rotate(1deg) scale(1.025);
	}

	50% {
		transform: rotate(0deg) scale(1.05);
	}

	75% {
		transform: rotate(-1deg) scale(1.025);
	}
}
</style>

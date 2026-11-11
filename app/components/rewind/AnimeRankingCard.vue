<script setup lang="ts">
import { getMediaCover } from "~/utils/media-display"
import type { RewindAnimeMetric } from "~/utils/rewind"

const props = withDefaults(defineProps<{
	/** Card title. Leave it out when a section heading already names the ranking. */
	title?: string
	items: readonly RewindAnimeMetric[]
	emptyLabel?: string
	variant?: "top" | "flop"
	/** "lg" makes the podium the visual peak of a page (Rewind). */
	size?: "md" | "lg"
	/** Shown under the podium only when two entries share a rank: say how ties are ordered. */
	tieNote?: string
}>(), {
	title: undefined,
	emptyLabel: "No scored anime for this year.",
	variant: "top",
	size: "md",
	tieNote: undefined
})

const MEDALS = ["gold", "silver", "bronze"] as const

const { title: getAnimeTitle } = useMediaTitle()

function getTitle(item: RewindAnimeMetric): string {
	return getAnimeTitle(item.entry.media ?? { id: item.entry.id })
}

// Posters are at most 176 CSS px wide: AniList's "large" cover (230 px) covers 1x, and the
// image pipeline downsizes it to WebP for the smaller steps.
function getCover(item: RewindAnimeMetric): string | undefined {
	return getMediaCover(item.entry.media, "medium") ?? undefined
}

function podiumOrder(rank: number): number {
	if (rank === 1) return 2
	if (rank === 2) return 1
	return 3
}

function riseDelay(rank: number): string {
	if (rank === 2) return "0ms"
	if (rank === 1) return "90ms"
	return "180ms"
}

const { format: formatScore } = usePersonalScore()

const scores = computed(() => props.items.map(item => item.entry.score ?? 0))
const ranks = computed(() => competitionRanks(scores.value))
const hasTie = computed(() => scores.value.some((_, index) => isTiedRank(scores.value, index)))

const large = computed(() => props.size === "lg")

function posterWidth(index: number): string {
	if (large.value) return index === 0 ? "w-28 sm:w-44" : "w-24 sm:w-36"
	return index === 0 ? "w-24 sm:w-28" : "w-20 sm:w-24"
}

function stepHeight(index: number): string {
	if (large.value) return ["h-32 sm:h-36", "h-24 sm:h-28", "h-18 sm:h-20"][index] ?? "h-18"
	return ["h-28", "h-20", "h-14"][index] ?? "h-14"
}
</script>

<template>
	<MetricsCard :title="title" v-bind="$attrs">
		<ol
			v-if="items.length"
			:key="items.map(item => item.entry.id).join('-')"
			class="flex items-end justify-center gap-2 sm:gap-4"
			:class="[title ? 'mt-3' : '', large ? 'min-h-96 sm:gap-6' : 'min-h-80']">
			<li
				v-for="(item, index) in items"
				:key="item.entry.id"
				class="flex min-w-0 flex-1 flex-col items-center justify-end"
				:class="large ? 'max-w-52' : 'max-w-40'"
				:style="{ order: podiumOrder(index + 1), animationDelay: riseDelay(index + 1) }"
				data-podium-item>
				<AnimeDetailsPopover
					v-if="item.entry.media?.title && item.entry.media.coverImage"
					:data="item.entry"
					mode="hover"
					:open-delay="100"
					:close-delay="100"
					:draggable="false"
					:content="{ sideOffset: 16 }">
					<button
						type="button"
						class="group/poster relative mb-3 cursor-pointer overflow-hidden rounded-lg shadow-lg ring-1 ring-default transition duration-200 hover:-translate-y-1 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
						:class="[
							posterWidth(index),
							index === 0 && variant === 'top' ? 'animate-podium-glow' : ''
						]"
						:aria-label="`Show details for ${getTitle(item)}`"
						:title="getTitle(item)">
						<NuxtImg
							:src="getCover(item)"
							:alt="`${getTitle(item)} cover`"
							width="176"
							height="264"
							fit="cover"
							format="webp"
							loading="lazy"
							class="aspect-2/3 w-full object-cover" />
						<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent px-2 pt-8 pb-2 text-left">
							<p class="line-clamp-2 text-xs font-semibold text-white" :class="large ? 'sm:text-sm' : ''">
								{{ getTitle(item) }}
							</p>
						</div>
					</button>
				</AnimeDetailsPopover>
				<div
					v-else
					class="mb-3 flex aspect-2/3 items-center justify-center rounded-lg bg-elevated"
					:class="posterWidth(index)">
					<UIcon name="i-lucide-image-off" class="size-6 text-muted" />
				</div>

				<div
					class="flex w-full flex-col items-center justify-start rounded-t-xl border border-b-0 px-2 pt-3 text-center"
					:class="[stepHeight(index), variant === 'flop' ? 'saturate-75' : '']"
					:data-medal="MEDALS[index]">
					<span
						class="leading-none font-black text-highlighted"
						:class="large ? 'text-3xl sm:text-4xl' : 'text-3xl'">
						{{ ranks[index] }}
					</span>
					<span class="mt-1 text-xs font-semibold text-muted">
						{{ formatScore(item.entry.score) }}
						<template v-if="isTiedRank(scores, index)">· Tied</template>
					</span>
				</div>
			</li>
		</ol>
		<div v-else class="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
			<UIcon name="i-lucide-trophy" class="size-7 text-muted" aria-hidden="true" />
			<p class="text-sm text-muted">
				{{ emptyLabel }}
			</p>
		</div>
		<p
			v-if="tieNote && hasTie"
			class="mt-3 text-center text-xs text-pretty text-muted"
			data-tie-note>
			{{ tieNote }}
		</p>
	</MetricsCard>
</template>

<style scoped>
/*
 * Medal colours come from the theme (`--color-medal-*` in main.css, light and dark).
 */
[data-medal] {
	border-color: color-mix(in oklab, var(--medal) 50%, transparent);
	background-color: color-mix(in oklab, var(--medal) 15%, transparent);
}

[data-medal="gold"] {
	--medal: var(--color-medal-gold);
}

[data-medal="silver"] {
	--medal: var(--color-medal-silver);
}

[data-medal="bronze"] {
	--medal: var(--color-medal-bronze);
}
</style>

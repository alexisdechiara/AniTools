<script setup lang="ts">
import StatisticsMediaStrip from "~/components/statistics/StatisticsMediaStrip.vue"
import type { StatisticMetric } from "~/utils/statistics"
import { formatMeanScore } from "~/utils/score-format"
import {
	describeCountComparison,
	sortBreakdownItems,
	type CountComparison,
	type CountComparisonTone,
	type StatisticsBreakdownItem
} from "~/utils/statistics-breakdown"

const props = withDefaults(defineProps<{
	dimension: "genres" | "tags" | "studios"
	items: readonly StatisticsBreakdownItem[]
	previousItems?: readonly StatisticsBreakdownItem[]
	comparisonLabel?: string
}>(), {
	previousItems: () => [],
	comparisonLabel: ""
})

const selectedMetric = defineModel<StatisticMetric>("metric", {
	default: "count"
})
const search = ref("")
const preferences = usePreferencesStore()

const COMPARISON_TONE_CLASSES: Record<CountComparisonTone, string> = {
	positive: "text-success",
	negative: "text-error",
	neutral: "text-muted"
}

const metricOptions = [
	{ label: "Count", value: "count", icon: "i-lucide-list-ordered" },
	{ label: "Mean score", value: "meanScore", icon: "i-lucide-star" },
	{ label: "Time watched", value: "minutesWatched", icon: "i-lucide-clock-3" }
]
const previousCountByKey = computed(() =>
	new Map(props.previousItems.map(item => [item.key, item.count]))
)
const filteredItems = computed(() => {
	const normalizedSearch = search.value.trim().toLocaleLowerCase()
	const matches = normalizedSearch
		? props.items.filter(item =>
			item.name.toLocaleLowerCase().includes(normalizedSearch)
		)
		: [...props.items]

	if (selectedMetric.value === "count") {
		return matches.toSorted((left, right) => right.count - left.count)
	}

	return sortBreakdownItems(matches, selectedMetric.value)
})
function itemUrl(item: StatisticsBreakdownItem): string {
	if (props.dimension === "studios") {
		return `https://anilist.co/studio/${encodeURIComponent(item.key)}`
	}

	return `https://anilist.co/search/anime?genres=${encodeURIComponent(item.name)}`
}

const comparisonByKey = computed(() => {
	const comparisons = new Map<string, CountComparison>()
	if (!props.comparisonLabel) return comparisons

	for (const item of props.items) {
		comparisons.set(item.key, describeCountComparison(
			item.count,
			previousCountByKey.value.get(item.key) ?? 0,
			props.comparisonLabel
		))
	}

	return comparisons
})
</script>

<template>
	<div class="space-y-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
			<UInput
				v-model="search"
				icon="i-lucide-search"
				placeholder="Filter this breakdown"
				aria-label="Filter statistics"
				class="w-full sm:max-w-xs"/>
			<UTabs
				v-model="selectedMetric"
				:items="metricOptions"
				:content="false"
				aria-label="Rank statistics by"
				class="w-full lg:ml-auto lg:w-fit"
				:ui="{ trigger: 'cursor-pointer' }"/>
		</div>

		<div
			v-if="filteredItems.length"
			class="grid gap-4 xl:grid-cols-2">
			<article
				v-for="(item, index) in filteredItems"
				:key="item.key"
				class="overflow-hidden rounded-xl border border-default bg-elevated shadow-sm transition hover:border-primary/40 hover:shadow-md">
				<div class="p-4 sm:p-5">
					<header class="flex items-start justify-between gap-3">
						<NuxtLink
							:to="itemUrl(item)"
							external
							target="_blank"
							rel="noopener noreferrer"
							class="min-w-0 truncate text-lg font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary sm:text-xl">
							{{ item.name }}
						</NuxtLink>
						<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-inverted shadow-sm">
							{{ index + 1 }}
						</span>
					</header>

					<dl class="mt-4 grid grid-cols-3 gap-2">
						<div
							class="rounded-lg px-2.5 py-2 transition"
							:class="selectedMetric === 'count' ? 'bg-primary/10' : 'bg-muted/40'">
							<dt class="text-[11px] text-muted sm:text-xs">
								Count
							</dt>
							<dd class="mt-0.5 font-semibold text-highlighted tabular-nums">
								{{ formatNumber(item.count) }}
							</dd>
						</div>
						<div
							class="rounded-lg px-2.5 py-2 transition"
							:class="selectedMetric === 'meanScore' ? 'bg-primary/10' : 'bg-muted/40'">
							<dt class="text-[11px] text-muted sm:text-xs">
								Mean score
							</dt>
							<dd class="mt-0.5 font-semibold text-highlighted tabular-nums">
								{{ formatMeanScore(item.meanScore, preferences.scoreFormat) }}
							</dd>
						</div>
						<div
							class="rounded-lg px-2.5 py-2 transition"
							:class="selectedMetric === 'minutesWatched' ? 'bg-primary/10' : 'bg-muted/40'">
							<dt class="text-[11px] text-muted sm:text-xs">
								Time watched
							</dt>
							<dd class="mt-0.5 truncate font-semibold text-highlighted tabular-nums">
								{{ formatWatchTime(item.minutesWatched) }}
							</dd>
						</div>
					</dl>

					<p
						v-if="comparisonByKey.get(item.key)"
						class="mt-3 text-xs"
						:class="COMPARISON_TONE_CLASSES[comparisonByKey.get(item.key)?.tone ?? 'neutral']">
						{{ comparisonByKey.get(item.key)?.text }}
					</p>
				</div>

				<StatisticsMediaStrip :media-ids="item.mediaIds" :limit="7"/>
			</article>
		</div>

		<UAlert
			v-else
			icon="i-lucide-chart-no-axes-column"
			title="No matching statistics"
			description="Try another filter or period. Year views only include entries with an AniList completion date."
			color="neutral"
			variant="soft"/>
	</div>
</template>

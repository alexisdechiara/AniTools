<script setup lang="ts">
import type { StatisticsBreakdownItem } from "~/utils/statistics-breakdown"
import type { StatisticMetric } from "~/utils/statistics"

const props = withDefaults(defineProps<{
	items: readonly StatisticsBreakdownItem[]
	metric: StatisticMetric
	icon: string
	emptyLabel?: string
}>(), {
	emptyLabel: "Not enough data yet."
})

const { format: formatScore } = usePersonalScore()

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

function rawMetric(item: StatisticsBreakdownItem): number {
	if (props.metric === "count") return item.count
	if (props.metric === "minutesWatched") return item.minutesWatched
	return item.meanScore
}

const values = computed(() => props.items.map(rawMetric))
const ranks = computed(() => competitionRanks(values.value))

function metricValue(item: StatisticsBreakdownItem): string {
	if (props.metric === "count") return `${item.count} anime`
	if (props.metric === "minutesWatched") return formatWatchTime(item.minutesWatched)
	return formatScore(item.meanScore)
}
</script>

<template>
	<ol
		v-if="items.length"
		:key="`${metric}-${items.map(item => item.key).join('-')}`"
		class="mt-3 flex min-h-72 items-end justify-center gap-3 sm:gap-6">
		<li
			v-for="(item, index) in items"
			:key="item.key"
			class="flex max-w-44 min-w-0 flex-1 flex-col items-center justify-end"
			:style="{ order: podiumOrder(index + 1), animationDelay: riseDelay(index + 1) }"
			data-podium-item>
			<span
				class="mb-3 flex items-center justify-center rounded-full ring-4 shadow-lg"
				:class="[
					index === 0 ? 'size-20 bg-amber-400/15 text-amber-500 ring-amber-400/30 animate-podium-glow' : '',
					index === 1 ? 'size-16 bg-slate-400/15 text-slate-400 ring-slate-400/30' : '',
					index === 2 ? 'size-14 bg-orange-700/15 text-orange-600 ring-orange-700/30' : ''
				]">
				<UIcon :name="icon" :class="index === 0 ? 'size-9' : index === 1 ? 'size-7' : 'size-6'" />
			</span>

			<p class="line-clamp-2 text-center text-sm font-semibold text-highlighted">
				{{ item.name }}
			</p>

			<div
				class="mt-3 flex w-full flex-col items-center justify-start rounded-t-xl border border-b-0 px-2 pt-3 text-center"
				:class="[
					index === 0 ? 'h-28 border-amber-400/50 bg-amber-400/15' : '',
					index === 1 ? 'h-20 border-slate-400/50 bg-slate-400/15' : '',
					index === 2 ? 'h-14 border-orange-700/50 bg-orange-700/15' : ''
				]">
				<span class="text-3xl leading-none font-black text-highlighted">
					{{ ranks[index] }}
				</span>
				<span class="mt-1 text-xs font-semibold text-muted">
					{{ metricValue(item) }}
					<template v-if="isTiedRank(values, index)">· Tied</template>
				</span>
			</div>
		</li>
	</ol>
	<p v-else class="mt-4 text-sm text-muted">
		{{ emptyLabel }}
	</p>
</template>

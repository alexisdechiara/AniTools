<script setup lang="ts">
import type { StatisticMetric } from "~/utils/statistics"
import {
	getCountChange,
	sortBreakdownItems,
	type StatisticsBreakdownItem
} from "~/utils/statistics-breakdown"

const props = withDefaults(defineProps<{
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

const metricOptions = [
	{ label: "Titles", value: "count" },
	{ label: "Mean score", value: "meanScore" },
	{ label: "Watch time", value: "minutesWatched" }
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

	return sortBreakdownItems(matches, selectedMetric.value)
})
const maxValue = computed(() =>
	Math.max(0, ...filteredItems.value.map(item => item[selectedMetric.value]))
)

function formatMetric(item: StatisticsBreakdownItem): string {
	if (selectedMetric.value === "meanScore") {
		return `${Number(item.meanScore.toFixed(2))}%`
	}
	if (selectedMetric.value === "minutesWatched") {
		return formatWatchTime(item.minutesWatched)
	}

	return item.count.toLocaleString()
}

function progressValue(item: StatisticsBreakdownItem): number {
	if (maxValue.value === 0) return 0
	return Math.round((item[selectedMetric.value] / maxValue.value) * 100)
}

function comparison(item: StatisticsBreakdownItem): number | null {
	return getCountChange(item.count, previousCountByKey.value.get(item.key) ?? 0)
}
</script>

<template>
	<div class="space-y-4">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<UInput
				v-model="search"
				icon="i-lucide-search"
				placeholder="Filter this breakdown"
				aria-label="Filter statistics"
				class="w-full sm:max-w-xs"/>
			<USelect
				v-model="selectedMetric"
				:items="metricOptions"
				aria-label="Statistic metric"
				class="w-full sm:ml-auto sm:w-44"/>
		</div>

		<div
			v-if="filteredItems.length"
			class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			<UPageCard
				v-for="(item, index) in filteredItems"
				:key="item.key"
				:ui="{ container: 'gap-y-3' }">
				<div class="flex items-start gap-3">
					<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
						{{ index + 1 }}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<h2 class="truncate text-sm font-medium text-highlighted">
								{{ item.name }}
							</h2>
							<span class="shrink-0 text-sm font-semibold text-highlighted tabular-nums">
								{{ formatMetric(item) }}
							</span>
						</div>
						<UProgress
							:model-value="progressValue(item)"
							:max="100"
							size="sm"
							class="mt-2"
							:aria-label="`${item.name}: ${formatMetric(item)}`"/>
						<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
							<span>{{ item.count.toLocaleString() }} titles</span>
							<span>{{ Number(item.meanScore.toFixed(2)) }}% mean</span>
							<span>{{ formatWatchTime(item.minutesWatched) }}</span>
						</div>
						<p
							v-if="comparisonLabel"
							class="mt-2 text-xs"
							:class="comparison(item) === null
								? 'text-muted'
								: (comparison(item) ?? 0) >= 0
									? 'text-success'
									: 'text-error'">
							<template v-if="comparison(item) === null">
								New compared with {{ comparisonLabel }}
							</template>
							<template v-else>
								{{ (comparison(item) ?? 0) > 0 ? '+' : '' }}{{ comparison(item) }}%
								titles compared with {{ comparisonLabel }}
							</template>
						</p>
					</div>
				</div>
			</UPageCard>
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

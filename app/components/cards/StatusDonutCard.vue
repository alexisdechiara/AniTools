<template>
	<MetricsCard v-bind="$attrs" v-model:sort="statusSort" title="Status" enable-sort-select>
		<DonutChart
			:data="chartData"
			:max-items="maxItems"
			:show-legend="showLegend"
			:show-tooltip="showTooltip"
			:orientation="orientation"
			:width="width"
			:height="height"
			:metric-type="statusSort" />
	</MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { sortStatistics } from "~/utils/statistics"
import { reconcileStatusStatistics } from "~/utils/dashboard-status"
import { donutMetricValue, type DonutCardDisplayProps, type DonutCardItem } from "~/utils/donut-card"

const { statuses: statusesRef, statusSort } = storeToRefs(useStatisticsStore())
const entriesStore = useEntriesStore()

export type DonutStatus = DonutCardItem

withDefaults(
	defineProps<DonutCardDisplayProps>(),
	{
		maxItems: 5,
		showLegend: true,
		showTooltip: false,
		orientation: "vertical",
		width: "100%",
		height: "200px"
	}
)

const statusColors: Record<string, string> = {
	COMPLETED: "var(--color-completed)",
	PLANNING: "var(--color-planning)",
	DROPPED: "var(--color-dropped)",
	CURRENT: "var(--color-watching)",
	WATCHING: "var(--color-watching)",
	PAUSED: "var(--color-paused)"
}

const STATUS_NAMES: Record<string, string> = {
	CURRENT: "Watching",
	REPEATING: "Rewatching"
}

// The statistics are a snapshot AniList refreshes on its own schedule; the list is live. Once
// the whole list is loaded its counts replace the snapshot's, so this card agrees with the
// list cards next to it. See reconcileStatusStatistics.
const liveEntries = computed(() =>
	entriesStore.isInitialized && !entriesStore.truncated && !entriesStore.error
		? entriesStore.entries
		: null
)

const chartData = computed<DonutStatus[]>(() => {
	const mapped = reconcileStatusStatistics(statusesRef.value, liveEntries.value)
		.map(item => ({
			color: statusColors[item.status] || "var(--ui-text-muted)",
			name: STATUS_NAMES[item.status]
				?? item.status.charAt(0) + item.status.slice(1).toLowerCase(),
			value: donutMetricValue(item, statusSort.value),
			count: item.count,
			meanScore: item.meanScore,
			minutesWatched: item.minutesWatched
		} satisfies DonutStatus))

	return sortStatistics(mapped, statusSort.value)
})
</script>

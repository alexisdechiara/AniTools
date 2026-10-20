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
import { donutMetricValue, type DonutCardDisplayProps, type DonutCardItem } from "~/utils/donut-card"

const { statuses: statusesRef, statusSort } = storeToRefs(useStatisticsStore())

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

// Mappage des statuts aux couleurs
const statusColors: Record<string, string> = {
	COMPLETED: "var(--color-completed)",
	PLANNING: "var(--color-planning)",
	DROPPED: "var(--color-dropped)",
	CURRENT: "var(--color-watching)", // CURRENT utilise la même couleur que WATCHING
	WATCHING: "var(--color-watching)",
	PAUSED: "var(--color-paused)"
}

// Type pour les statuts d'anime
interface AnimeStatus {
	status: string
	meanScore?: number
	minutesWatched?: number
	count?: number
}

// Transforme les données pour le composant DonutChart
const chartData = computed<DonutStatus[]>(() => {
	const statuses = (statusesRef.value || []) as AnimeStatus[]

	if (!statuses || statuses.length === 0) return []

	const mapped = statuses
		.filter((s): s is AnimeStatus => !!s.status)
		.map((s) => ({
			color: statusColors[s.status] || "var(--ui-text-muted)",
			name:
				s.status === "CURRENT"
					? "Watching"
					: s.status.charAt(0) + s.status.slice(1).toLowerCase(),
			value: donutMetricValue(s, statusSort.value),
			count: s.count ?? 0,
			meanScore: s.meanScore,
			minutesWatched: s.minutesWatched
		} satisfies DonutStatus))

	return sortStatistics(mapped, statusSort.value)
})
</script>

<script setup lang="ts">
import type { DonutDataItem } from "~/components/charts/DonutChart.vue"
import type { RewindBreakdown } from "~/utils/rewind"

defineOptions({ name: "RewindStatusDonutCard" })

const props = defineProps<{
	items: readonly RewindBreakdown[]
}>()

const statusColors: Record<string, string> = {
	COMPLETED: "var(--color-completed)",
	PLANNING: "var(--color-planning)",
	DROPPED: "var(--color-dropped)",
	CURRENT: "var(--color-watching)",
	WATCHING: "var(--color-watching)",
	PAUSED: "var(--color-paused)",
	REPEATING: "var(--ui-color-primary-500)"
}

const chartData = computed<DonutDataItem[]>(() => props.items.map(item => ({
	name: item.name === "CURRENT"
		? "Watching"
		: item.name.charAt(0) + item.name.slice(1).toLocaleLowerCase("en"),
	value: item.count,
	count: item.count,
	color: statusColors[item.name] ?? "var(--ui-text-muted)"
})))
</script>

<template>
	<MetricsCard title="Current list status" v-bind="$attrs">
		<DonutChart
			:data="chartData"
			:max-items="6"
			show-legend
			show-tooltip
			orientation="horizontal"
			height="220px" />
	</MetricsCard>
</template>

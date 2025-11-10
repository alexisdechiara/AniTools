<template>
	<MetricsCard title="Watch Year" v-bind="$attrs">
		<UTabs :items="items" class="w-fit absolute top-6 right-6" :ui="{ trigger: 'cursor-pointer' }"
			v-model="selectedTab" />
		<VisXYContainer :data="yearlyData" :height="256" class="mt-8">
			<VisArea :x="(d: YearlyData) => d.year"
				:y="(d: YearlyData) => selectedTab === 'minutesWatched' ? d.minutesWatched : selectedTab === 'meanScore' ? d.meanScore : d.count" />
			<VisLine :x="(d: YearlyData) => d.year" interpolateMissingData
				:y="(d: YearlyData) => selectedTab === 'minutesWatched' ? d.minutesWatched : selectedTab === 'meanScore' ? d.meanScore : d.count" />
			<VisAxis type="x" :gridLine="false" :domainLine="false" :tickLine="false" tickTextAlign="center"
				:tickFormat="(d: number) => d.toString()" :numTicks="Math.min(5, yearlyData.length)" />
			<VisAxis type="y" :gridLine="false" :domainLine="false" :tickLine="false"
				:tickFormat="(d: number) => formatYAxis(d, selectedTab)" :numTicks="5" position="end" />
			<VisTooltip />
			<VisCrosshair :template="crosshairTemplate" :color="'var(--ui-color-primary-700)'" />
		</VisXYContainer>
	</MetricsCard>
</template>

<script setup lang="ts">
import {
	VisXYContainer,
	VisLine,
	VisTooltip,
	VisAxis,
	VisCrosshair,
	VisArea,
} from "@unovis/vue";
import { computed } from "vue";
import type { TabsItem } from "@nuxt/ui";
import { useStatisticsStore } from "~/stores/Statistics";

const statisticsStore = useStatisticsStore();
const { startYears } = storeToRefs(statisticsStore);

const items = ref<TabsItem[]>([
	{
		label: "Titles Watched",
		value: "count",
		icon: "i-lucide-list-ordered",
	},
	{
		label: "Average Score",
		value: "meanScore",
		icon: "i-lucide-bar-chart-4",
	},
	{
		label: "Watch Time",
		value: "minutesWatched",
		icon: "i-lucide-clock",
	},
]);

const selectedTab = ref("count");

// Type for yearly data
interface YearlyData {
	year: number;
	meanScore: number;
	count: number;
	minutesWatched: number;
}

// Format data for the chart
const yearlyData = computed<YearlyData[]>(() => {
	if (!startYears.value) return [];

	// Filter and map data with strict type checking
	const filteredData = startYears.value
		.filter(
			(item): item is NonNullable<typeof item> => item !== null && item.startYear !== null
		)
		.map((item) => ({
			year: Number(item.startYear),
			meanScore: item.meanScore || 0,
			count: item.count || 0,
			minutesWatched: item.minutesWatched || 0,
		}));

	// Sort by year
	return filteredData.sort((a, b) => a.year - b.year);
});

// Tooltip triggers
// Format Y-axis labels based on the selected tab
const formatYAxis = (value: number, tab: string): string => {
	if (tab === "meanScore") return `${Math.round(value)}%`;
	if (tab === "count") return Math.round(value).toString();

	// For watch time, determine the best unit to display
	const maxValue = Math.max(...yearlyData.value.map((d) => d.minutesWatched));

	if (maxValue >= 60 * 24) {
		// Show in days if max is more than a day
		return `${Math.round(value / (60 * 24))}d`;
	} else if (maxValue >= 60) {
		// Show in hours if max is more than an hour
		return `${Math.round(value / 60)}h`;
	}
	// Default to minutes
	return `${Math.round(value)}m`;
};

const crosshairTemplate = (d: YearlyData) => {
	return `
    <div class='flex flex-col p-1 text-sm gap-0.5'>
		 <span class='font-bold text-base mb-0.5'>${d.year}</span>
		 <div class='inline-flex justify-between items-center gap-4'>
			<span class='text-thin'>Mean Score</span>
			<span class='font-medium'>${d.meanScore} %</span>
		 </div>
		 <div class='inline-flex justify-between items-center gap-4'>
			<span class='text-thin'>Titles Watched</span>
			<span class='font-medium'>${d.count}</span>
		 </div>
		 <div class='inline-flex justify-between items-center gap-4'>
			<span class='text-thin'>Watch Time</span>
			<span class='font-medium'>${formatWatchTime(d.minutesWatched)}</span>
		 </div>
    </div>
  `;
};
</script>

<style scoped>
.unovis-xy-container {
	overflow: visible !important;
	--vis-area-fill-opacity: 1;
	--vis-area-fill-opacity: 0.1;
	--vis-area-hover-fill-opacity: 0.1;
	--vis-color0: var(--ui-color-primary-400);

	--vis-crosshair-line-stroke-color: var(--ui-color-primary-700) !important;
	--vis-crosshair-line-stroke-width: 1px !important;
}
</style>

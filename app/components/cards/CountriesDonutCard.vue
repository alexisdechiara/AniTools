<template>
	<MetricsCard
		v-bind="$attrs"
		v-model:sort="countriesSort"
		title="Countries of origin"
		enable-sort-select>
		<DonutChart
			:data="chartData"
			:max-items="maxItems"
			:show-legend="showLegend"
			:show-tooltip="showTooltip"
			:orientation="orientation"
			:width="width"
			:height="height"
			:angle-range="DONUT_HALF_ANGLE_RANGE_TOP"
			:metric-type="countriesSort"
			class="gap-4!" />
	</MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { DONUT_HALF_ANGLE_RANGE_TOP } from "@unovis/ts"
import { sortStatistics } from "~/utils/statistics"
import { donutMetricValue, type DonutCardDisplayProps, type DonutCardItem } from "~/utils/donut-card"

const { countries: countriesRef, countriesSort } = storeToRefs(useStatisticsStore())

export interface DonutCountry extends DonutCardItem {
	country: string
}

withDefaults(
	defineProps<DonutCardDisplayProps>(),
	{
		maxItems: 4,
		showLegend: true,
		showTooltip: false,
		orientation: "vertical",
		width: "100%",
		height: "128px"
	}
)

// Country information definition
const countryData: Record<string, { name: string, color: string }> = {
	JP: {
		name: "Japan",
		color: "var(--color-completed)"
	},
	CN: {
		name: "China",
		color: "var(--color-planning)"
	},
	TW: {
		name: "Taiwan",
		color: "var(--color-dropped)"
	},
	KR: {
		name: "South Korea",
		color: "var(--color-watching)"
	}
}

// Transform data for the chart
const chartData = computed<DonutCountry[]>(() => {
	const countries = (countriesRef.value || [])
		.filter((country): country is typeof country & { country: string } =>
			country.country !== null
		)

	if (countries.length === 0) return []

	const mapped = countries.map((c) => {
		const countryInfo = countryData[c.country] || {
			name: c.country,
			color: "var(--ui-text-muted)"
		}

		return {
			color: countryInfo.color,
			name: countryInfo.name,
			value: donutMetricValue(c, countriesSort.value),
			count: c.count ?? 0,
			country: c.country,
			meanScore: c.meanScore,
			minutesWatched: c.minutesWatched
		}
	})

	return sortStatistics(mapped, countriesSort.value)
})
</script>

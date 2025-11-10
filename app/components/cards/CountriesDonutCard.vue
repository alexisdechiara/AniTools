<template>
  <MetricsCard title="Countries of origin" v-bind="$attrs">
    <DonutChart
      :data="chartData"
      :max-items="maxItems"
      :show-legend="showLegend"
      :show-tooltip="showTooltip"
      :orientation="orientation"
      :width="width"
      :height="height"
      :angle-range="DONUT_HALF_ANGLE_RANGE_TOP"
      class="gap-4!"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { DONUT_HALF_ANGLE_RANGE_TOP } from "@unovis/ts";
const { countries: countriesRef } = storeToRefs(useStatisticsStore());

export interface DonutCountry {
  color: string;
  name: string;
  value: number;
  count: number;
  [key: string]: any;
}

withDefaults(
  defineProps<{
    maxItems?: number;
    showLegend?: boolean;
    showTooltip?: boolean;
    orientation?: "horizontal" | "vertical";
    width?: string;
    height?: string;
  }>(),
  {
    maxItems: 4,
    showLegend: true,
    showTooltip: false,
    orientation: "vertical",
    width: "100%",
    height: "128px",
  }
);

// Country information definition
const countryData: Record<string, { name: string; color: string }> = {
  JP: {
    name: "Japan",
    color: "var(--color-completed)",
  },
  CN: {
    name: "China",
    color: "var(--color-planning)",
  },
  TW: {
    name: "Taiwan",
    color: "var(--color-dropped)",
  },
  KR: {
    name: "South Korea",
    color: "var(--color-watching)",
  },
};

// Transform data for the chart
const chartData = computed<DonutCountry[]>(() => {
  const countries = (countriesRef.value || []) as Array<{
    country: string;
    count: number;
  }>;

  // If no data, return an empty array
  if (countries.length === 0) return [];

  // Create an object with only countries that have data
  const countryCounts = Object.fromEntries(countries.map((c) => [c.country, c.count]));

  // Calculate total count
  const total = Object.values(countryCounts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  // Transform data for the chart
  return Object.entries(countryCounts)
    .map(([countryCode, count]) => {
      const countryInfo = countryData[countryCode] || {
        name: countryCode,
        color: "var(--color-text-muted)",
      };

      return {
        color: countryInfo.color,
        name: countryInfo.name,
        value: parseFloat(((count / total) * 100).toFixed(2)),
        count,
        country: countryCode,
      };
    })
    .sort((a, b) => b.count - a.count); // Trie par ordre décroissant
});
</script>

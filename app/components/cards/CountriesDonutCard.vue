<template>
  <MetricsCard
    title="Countries of origin"
    v-bind="$attrs"
    enable-sort-select
    v-model:sort="countriesSort"
  >
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
      class="gap-4!"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { DONUT_HALF_ANGLE_RANGE_TOP } from "@unovis/ts";
const { countries: countriesRef, countriesSort } = storeToRefs(useStatisticsStore());

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
    count?: number;
    meanScore?: number;
    minutesWatched?: number;
  }>;

  if (countries.length === 0) return [];

  // determine accessor based on selectedSort
  const accessor = (c: typeof countries[number]) => {
    if (countriesSort.value === "meanScore") return c.meanScore ?? 0;
    if (countriesSort.value === "minutesWatched") return c.minutesWatched ?? 0;
    return c.count ?? 0;
  };

  // Pas de calcul de pourcentage ici; on transmet des valeurs brutes au DonutChart

  const mapped = countries
    .filter((c) => c.country)
    .map((c) => {
      const countryInfo = countryData[c.country] || {
        name: c.country,
        color: "var(--color-text-muted)",
      };
      const metric = accessor(c);
      return {
        color: countryInfo.color,
        name: countryInfo.name,
        value: metric,
        count: c.count ?? 0,
        country: c.country,
        meanScore: c.meanScore,
        minutesWatched: c.minutesWatched,
      };
    });

  // Always keep a deterministic order (default by count when metric is count)
  if (countriesSort.value === "count") return mapped.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  if (countriesSort.value === "meanScore") return mapped.sort((a, b) => (b.meanScore ?? 0) - (a.meanScore ?? 0));
  return mapped.sort((a, b) => (b.minutesWatched ?? 0) - (a.minutesWatched ?? 0));
});
</script>

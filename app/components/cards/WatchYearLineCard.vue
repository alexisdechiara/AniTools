<template>
  <MetricsCard title="Watch Year" v-bind="$attrs">
    <UTabs
      :items="items"
      class="w-fit absolute top-6 right-6"
      :ui="{ trigger: 'cursor-pointer' }"
      v-model="selectedTab"
    />
    <LineChart
      class="mt-8"
      :data="yearlyData"
      :selectedMetric="selectedTab"
      :height="256"
      :brush="false"
      :autoBrush="true"
      :showArea="true"
      :showTooltip="true"
    />
  </MetricsCard>
</template>

<script setup lang="ts">
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

type SelectedMetric = 'count' | 'meanScore' | 'minutesWatched'
const selectedTab = ref<SelectedMetric>('count')

// Type for yearly data
interface YearlyData {
  year: number;
  meanScore: number;
  count: number;
  minutesWatched: number;
}

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
</script>

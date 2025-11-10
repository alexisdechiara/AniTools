<template>
  <MetricsCard title="Release Year" v-bind="$attrs">
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
      :autoBrush="true"
      :brushHeight="85"
      :showArea="true"
      :showTooltip="true"
    />
  </MetricsCard>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { TabsItem } from "@nuxt/ui";
import { useStatisticsStore } from "~/stores/Statistics";

const statisticsStore = useStatisticsStore();
const { releaseYears } = storeToRefs(statisticsStore);

const items = ref<TabsItem[]>([
  { label: "Titles Released", value: "count", icon: "i-lucide-list-ordered" },
  { label: "Average Score", value: "meanScore", icon: "i-lucide-bar-chart-4" },
  { label: "Watch Time", value: "minutesWatched", icon: "i-lucide-clock" },
]);

type SelectedMetric = "count" | "meanScore" | "minutesWatched";
const selectedTab = ref<SelectedMetric>("count");

interface YearlyData {
  year: number;
  meanScore: number;
  count: number;
  minutesWatched: number;
}

const yearlyData = computed<YearlyData[]>(() => {
  if (!releaseYears.value) return [];
  const filtered = releaseYears.value
    .filter(
      (item): item is NonNullable<typeof item> =>
        item !== null && (item as any).releaseYear !== null
    )
    .map((item) => ({
      year: Number((item as any).releaseYear),
      meanScore: (item as any).meanScore || 0,
      count: (item as any).count || 0,
      minutesWatched: (item as any).minutesWatched || 0,
    }));
  return filtered.sort((a, b) => a.year - b.year);
});
</script>

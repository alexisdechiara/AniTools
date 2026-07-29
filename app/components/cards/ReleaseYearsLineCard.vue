<template>
  <MetricsCard title="Release Year" v-bind="$attrs">
    <UTabs
      v-model="selectedTab"
      :items="items"
      class="absolute top-6 right-6 w-fit"
      :ui="{ trigger: 'cursor-pointer' }"/>

    <LineChart
      class="mt-8"
      :data="yearlyData"
      :selected-metric="selectedTab"
      :height="256"
      :auto-brush="true"
      :brush-height="85"
      :show-area="true"
      :show-tooltip="true"/>
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
        item !== null && item.releaseYear !== null
    )
    .map((item) => ({
      year: Number(item.releaseYear),
      meanScore: item.meanScore ?? 0,
      count: item.count ?? 0,
      minutesWatched: item.minutesWatched ?? 0,
    }));
  return filtered.sort((a, b) => a.year - b.year);
});
</script>

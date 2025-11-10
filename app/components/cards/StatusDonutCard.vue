<template>
  <MetricsCard title="Status" v-bind="$attrs" enable-sort-select v-model:sort="statusSort">
    <DonutChart
      :data="chartData"
      :max-items="maxItems"
      :show-legend="showLegend"
      :show-tooltip="showTooltip"
      :orientation="orientation"
      :width="width"
      :height="height"
      :metric-type="statusSort"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";

const { statuses: statusesRef, statusSort } = storeToRefs(useStatisticsStore());

export interface DonutStatus {
  color: string;
  name: string;
  value: number;
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
    maxItems: 5,
    showLegend: true,
    showTooltip: false,
    orientation: "vertical",
    width: "100%",
    height: "200px",
  }
);

// Mappage des statuts aux couleurs
const statusColors: Record<string, string> = {
  COMPLETED: "var(--color-completed)",
  PLANNING: "var(--color-planning)",
  DROPPED: "var(--color-dropped)",
  CURRENT: "var(--color-watching)", // CURRENT utilise la même couleur que WATCHING
  WATCHING: "var(--color-watching)",
  PAUSED: "var(--color-paused)",
};

// Type pour les statuts d'anime
interface AnimeStatus {
  status: string;
  meanScore?: number;
  minutesWatched?: number;
  count?: number;
}

// Transforme les données pour le composant DonutChart
const chartData = computed<DonutStatus[]>(() => {
  const statuses = (statusesRef.value || []) as AnimeStatus[];

  if (!statuses || statuses.length === 0) return [];

  const accessor = (s: AnimeStatus) => {
    if (statusSort.value === "meanScore") return s.meanScore ?? 0;
    if (statusSort.value === "minutesWatched") return s.minutesWatched ?? 0;
    return s.count ?? 0;
  };

  const mapped = statuses
    .filter((s): s is AnimeStatus => !!s.status)
    .map((s) => {
      const metric = accessor(s);
      return {
        color: statusColors[s.status] || "var(--color-text-muted)",
        name:
          s.status === "CURRENT"
            ? "Watching"
            : s.status.charAt(0) + s.status.slice(1).toLowerCase(),
        value: metric,
        count: s.count ?? 0,
        meanScore: s.meanScore,
        minutesWatched: s.minutesWatched,
      } as DonutStatus;
    });

  if (statusSort.value === "count") return mapped.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  if (statusSort.value === "meanScore") return mapped.sort((a, b) => (b.meanScore ?? 0) - (a.meanScore ?? 0));
  return mapped.sort((a, b) => (b.minutesWatched ?? 0) - (a.minutesWatched ?? 0));
});
</script>

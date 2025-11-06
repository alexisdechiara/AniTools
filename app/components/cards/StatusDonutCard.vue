<template>
  <MetricsCard title="Status" v-bind="$attrs">
    <DonutChart
      :data="chartData"
      :max-items="maxItems"
      :show-legend="showLegend"
      :show-tooltip="showTooltip"
      :orientation="orientation"
      :width="width"
      :height="height"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useStatisticsStore } from "~/stores/Statistics";

const statisticsStore = useStatisticsStore();

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
  meanScore: number;
  minutesWatched: number;
  count: number;
}

// Transforme les données pour le composant DonutChart
const chartData = computed<DonutStatus[]>(() => {
  const statuses = (statisticsStore.anime?.statuses as AnimeStatus[] | undefined) || [];

  // Calcule le nombre total d'éléments pour les pourcentages
  const total = statuses.reduce((sum, status) => sum + (status.count || 0), 0);
  if (total === 0) return [];

  return statuses
    .filter(
      (status): status is AnimeStatus => status?.status != null && status.count != null
    )
    .map((status) => {
      // Calcule le pourcentage avec 2 décimales
      const percentage = (status.count / total) * 100;
      const { count, ...rest } = status; // On extrait count séparément
      return {
        color: statusColors[status.status] || "var(--color-text-muted)",
        name: status.status.charAt(0) + status.status.slice(1).toLowerCase(),
        value: parseFloat(percentage.toFixed(2)), // Arrondi à 2 décimales
        count, // On garde le comptage brut aussi au cas où
        ...rest, // On étend avec le reste des propriétés sauf count
      };
    });
});
</script>

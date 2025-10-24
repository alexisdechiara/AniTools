<template>
  <MetricsCard v-bind="$attrs">
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
import DonutChart from "~/components/charts/DonutChart.vue";

export interface DonutStatus {
  color: string;
  name: string;
  value: number;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    data?: DonutStatus[];
    maxItems?: number;
    showLegend?: boolean;
    showTooltip?: boolean;
    orientation?: "horizontal" | "vertical";
    width?: string;
    height?: string;
  }>(),
  {
    data: () => [
      { color: "var(--color-completed)", name: "Completed", value: 64 },
      { color: "var(--color-planning)", name: "Planning", value: 31 },
      { color: "var(--color-dropped)", name: "Dropped", value: 3 },
      { color: "var(--color-watching)", name: "Watching", value: 3 },
    ],
    maxItems: 5,
    showLegend: true,
    showTooltip: false,
    orientation: "vertical",
    width: "100%",
    height: "200px",
  }
);

// Transforme les données pour le composant DonutChart
const chartData = computed(() => {
  return props.data.map((item) => ({
    ...item,
    // S'assure que la valeur est un nombre
    value: Number(item.value) || 0,
  }));
});
</script>

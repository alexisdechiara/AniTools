<template>
  <div class="flex gap-8" :class="orientation === 'horizontal' ? 'flex-row' : 'flex-col'">
    <VisSingleContainer
      :data="chartDataForDonut"
      :width="width"
      :height="height"
      :style="{ '--chart-width': width, '--chart-height': height }"
    >
      <VisDonut
        :value="value"
        :padAngle="0.05"
        :showBackground="false"
        :cornerRadius="16"
        :color="color"
        :events="showCentralValue ? events : {}"
        :centralLabel="showCentralValue ? centralLabelText : ''"
        :centralSubLabel="showCentralValue ? centralSubLabelText : ''"
        :angleRange="angleRange || [0, 360]"
      />
      <VisTooltip v-if="showTooltip" :triggers="triggers" />
    </VisSingleContainer>

    <ul
      v-if="showLegend"
      class="text-sm flex flex-col gap-2"
      :class="orientation === 'horizontal' ? 'mx-0 justify-center' : 'mx-4'"
    >
      <li
        v-for="(item, index) in processedData"
        :key="item.name"
        class="flex justify-start items-center gap-x-2"
      >
        <div
          class="size-2 rounded-full"
          :style="{
            backgroundColor: item.color,
            opacity: isItemInOverflow(item) ? 0.5 : 1,
          }"
        />
        <span :class="{ 'opacity-50': isItemInOverflow(item) }">
          {{ item.name }}
        </span>
        <span class="ms-auto">{{ legendRawValue(item) }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { Donut } from "@unovis/ts";
import { VisSingleContainer, VisDonut, VisTooltip } from "@unovis/vue";

export interface DonutDataItem {
  color: string;
  name: string;
  value: number;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    data: DonutDataItem[];
    width?: string;
    height?: string;
    maxItems?: number;
    showLegend?: boolean;
    showTooltip?: boolean;
    showCentralValue?: boolean;
    orientation?: "horizontal" | "vertical";
    angleRange?: [number, number];
    metricType?: 'count' | 'meanScore' | 'minutesWatched';
  }>(),
  {
    width: "100%",
    height: "200px",
    maxItems: 5,
    showLegend: true,
    showTooltip: false, // Désactivé par défaut
    showCentralValue: true, // Activé par défaut
    orientation: "vertical",
    metricType: 'count', // Add default value for metricType
  }
);

// Traite les données pour gérer le débordement
const processedData = computed<DonutDataItem[]>(() => {
  if (!props.data?.length) return [];

  // Crée une copie profonde des données
  const sortedData = [...props.data]
    .map((item) => ({
      ...item,
      isOverflowItem: false,
      isOverflow: false,
    }))
    .sort((a, b) => b.value - a.value);

  // Si on a moins d'éléments que le maximum, on retourne tout
  if (sortedData.length <= props.maxItems) {
    return sortedData;
  }

  // Sinon, on regroupe les éléments restants dans "Autres"
  const mainItems = sortedData.slice(0, props.maxItems - 1);
  const otherItems = sortedData.slice(props.maxItems - 1);

  const otherSum = otherItems.reduce((sum, item) => sum + item.value, 0);

  return [
    ...mainItems,
    {
      name: "Other",
      value: parseFloat(otherSum.toFixed(2)),
      color: "var(--ui-text-muted)",
      isOverflow: true,
      isOverflowItem: false,
    },
    ...otherItems.map((item) => ({
      ...item,
      isOverflowItem: true,
    })),
  ] as DonutDataItem[];
});

// Données réellement affichées dans le donut (on garde "Other", on masque les items overflow individuels)
const chartDataForDonut = computed<DonutDataItem[]>(() =>
  processedData.value.filter((i) => !i.isOverflowItem)
);

// Vérifie si un élément fait partie du débordement
const isItemInOverflow = (item: DonutDataItem): boolean => {
  return Boolean(item?.isOverflowItem);
};

// Fonctions pour le graphique
const value = (d: DonutDataItem) => d?.value ?? 0;
const color = (d: unknown, i: number) => chartDataForDonut.value[i]?.color || "var(--ui-text-muted)";

// Totaux pour le calcul des pourcentages (centre + tooltip)
const totalAll = computed(() => (props.data ?? []).reduce((s, it) => s + (it?.value ?? 0), 0));

// Gestion des labels centraux
const centralLabelText = ref("");
const centralSubLabelText = ref("");

// Configuration du tooltip
const triggers = {
  [Donut.selectors.segment]: (d: { index: number }) => {
    const item = chartDataForDonut.value[d.index];
    if (!item) return "";

    const percent = totalAll.value ? Math.round(((item.value || 0) / totalAll.value) * 100) : 0;
    return `
      <div class='flex flex-col p-1'>
        <span class='font-semibold capitalize'>${item.name || ""}</span>
        <span>${percent}%</span>
      </div>
    `;
  },
};

// Gestion des événements
const events = {
  [Donut.selectors.segment]: {
    mouseover: (d: { index: number }) => {
      const item = chartDataForDonut.value[d.index];
      if (item) {
        centralLabelText.value = item.name || "";
        const percent = totalAll.value ? Math.round(((item.value || 0) / totalAll.value) * 100) : 0;
        centralSubLabelText.value = `${percent}%`;
      }
    },
    mouseout: () => {
      centralLabelText.value = "";
      centralSubLabelText.value = "";
    },
  },
};

// Affichage brut dans la légende selon les métadonnées disponibles
const formatDuration = (minutes: number) => {
  const d = Math.floor((minutes || 0) / 1440);
  const h = Math.floor(((minutes || 0) % 1440) / 60);
  const m = (minutes || 0) % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const legendRawValue = (item: DonutDataItem): string => {
  // Si un type de métrique est fourni, on suit strictement ce type
  if (props.metricType === 'meanScore') return `${item.meanScore ?? item.value ?? 0}%`;
  if (props.metricType === 'minutesWatched') return formatDuration((item as any).minutesWatched ?? item.value ?? 0);
  if (props.metricType === 'count') return String((item as any).count ?? item.value ?? 0);

  // Fallback heuristique si metricType n'est pas fourni
  if (typeof (item as any).count === 'number') return String((item as any).count);
  if (typeof (item as any).minutesWatched === 'number') return formatDuration((item as any).minutesWatched);
  if (typeof (item as any).meanScore === 'number') return `${(item as any).meanScore}%`;
  return String(item.value ?? 0);
};
</script>

<style scoped>
.unovis-single-container {
  --vis-donut-central-label-font-size: 16px;
  --vis-donut-central-label-text-color: var(--ui-text);
  --vis-donut-central-label-font-family: var(--font-sans);
  --vis-donut-central-label-font-weight: 600;

  --vis-donut-central-sub-label-font-size: 12px;
  --vis-donut-central-sub-label-text-color: var(--ui-text-muted);
  --vis-donut-central-sub-label-font-family: var(--font-sans);
  --vis-donut-central-sub-label-font-weight: 400;
}

/* Force le débordement visible sur tous les éléments Unovis */
.unovis-single-container :deep(*) {
  overflow: visible !important;
}

/* Style de base des segments */
.unovis-single-container :deep(path[class*="segment"]) {
  opacity: 1;
  transform: scale(1);
  transition: transform 250ms ease, opacity 250ms ease, fill 250ms ease !important;
  cursor: pointer;
  transform-box: fill-box;
  transform-origin: 50% 50%;
}

/* Style quand un segment est survolé */
.unovis-single-container :deep(path[class*="segment"]:hover) {
  opacity: 1 !important;
  transform: scale(1.03) !important;
  filter: brightness(90%) !important;
}

/* Style de tous les segments non survolés quand l'un d'eux est survolé */
.unovis-single-container:has(path[class*="segment"]:hover)
  :deep(path[class*="segment"]:not(:hover)) {
  opacity: 0.3 !important;
}
</style>

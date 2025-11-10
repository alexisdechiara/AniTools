<template>
  <div class="flex gap-8" :class="orientation === 'horizontal' ? 'flex-row' : 'flex-col'">
    <VisSingleContainer
      :data="data"
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
        <span class="ms-auto">{{ item.value }}%</span>
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
  }>(),
  {
    width: "100%",
    height: "200px",
    maxItems: 5,
    showLegend: true,
    showTooltip: false, // Désactivé par défaut
    showCentralValue: true, // Activé par défaut
    orientation: "vertical",
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

// Vérifie si un élément fait partie du débordement
const isItemInOverflow = (item: DonutDataItem): boolean => {
  return Boolean(item?.isOverflowItem);
};

// Fonctions pour le graphique
const value = (d: DonutDataItem) => d?.value ?? 0;
const color = (d: number, i: number) =>
  processedData.value[i]?.color || "var(--ui-text-muted)";

// Gestion des labels centraux
const centralLabelText = ref("");
const centralSubLabelText = ref("");

// Configuration du tooltip
const triggers = {
  [Donut.selectors.segment]: (d: { index: number }) => {
    const item = processedData.value[d.index];
    if (!item) return "";

    return `
      <div class='flex flex-col p-1'>
        <span class='font-semibold capitalize'>${item.name || ""}</span>
        <span>${item.value || 0}%</span>
      </div>
    `;
  },
};

// Gestion des événements
const events = {
  [Donut.selectors.segment]: {
    mouseover: (d: { index: number }) => {
      const item = processedData.value[d.index];
      if (item) {
        centralLabelText.value = item.name || "";
        centralSubLabelText.value = `${item.value || 0}%`;
      }
    },
    mouseout: () => {
      centralLabelText.value = "";
      centralSubLabelText.value = "";
    },
  },
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

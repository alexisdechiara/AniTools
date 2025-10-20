<template>
  <MetricsCard v-bind="$attrs">
    <VisSingleContainer :data="data" width="100%" class="h-48">
      <VisDonut
        :value="value"
        :padAngle="0.05"
        :showBackground="false"
        :cornerRadius="16"
        :color="color"
        :events="events"
        :centralLabel="centralLabelText"
        :centralSubLabel="centralSubLabelText"
      />
      <!-- <VisTooltip :triggers="triggers" /> -->
    </VisSingleContainer>

    <ul class="mx-4 text-sm">
      <li
        v-for="d in data"
        :key="d.name"
        class="flex justify-start items-center gap-x-2 my-2"
      >
        <div class="size-2 rounded-full" :style="{ backgroundColor: d.color }" />
        {{ d.name }}
        <span class="ms-auto">{{ d.value }} %</span>
      </li>
    </ul>
  </MetricsCard>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Donut } from "@unovis/ts";
import { VisSingleContainer, VisDonut, VisTooltip } from "@unovis/vue";

type DonutStatus = {
  color: string;
  name: string;
  value: number;
};

const data: DonutStatus[] = [
  { color: "var(--color-completed)", name: "Completed", value: 64 },
  { color: "var(--color-planning)", name: "Planning", value: 31 },
  { color: "var(--color-dropped)", name: "Dropped", value: 3 },
  { color: "var(--color-watching)", name: "Watching", value: 3 },
];

const value = (d: DonutStatus) => d.value;
const color = (d: number, i: number) => data.map((s: DonutStatus) => s.color)[i];

const centralLabelText = ref("");
const centralSubLabelText = ref("");

const triggers = {
  [Donut.selectors.segment]: (d: any) => `
    <div class='flex flex-col'>
      <span class='font-semibold capitalize'>${d.data.name}</span>
      ${d.data.value} %
    </div>
  `,
};

const events = {
  [Donut.selectors.segment]: {
    mouseover: (d: any) => {
      centralLabelText.value = d.data.name;
      centralSubLabelText.value = `${d.data.value} %`;
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
  filter: none !important;
}

/* Style de tous les segments non survolés quand l'un d'eux est survolé */
.unovis-single-container:has(path[class*="segment"]:hover)
  :deep(path[class*="segment"]:not(:hover)) {
  opacity: 0.3 !important;
}

/* Applique les couleurs de survol spécifiques */
.unovis-single-container :deep(path[style*="--color-completed"]:hover) {
  fill: var(--color-completed-hover) !important;
}

.unovis-single-container :deep(path[style*="--color-planning"]:hover) {
  fill: var(--color-planning-hover) !important;
}

.unovis-single-container :deep(path[style*="--color-dropped"]:hover) {
  fill: var(--color-dropped-hover) !important;
}

.unovis-single-container :deep(path[style*="--color-watching"]:hover) {
  fill: var(--color-watching-hover) !important;
}
</style>

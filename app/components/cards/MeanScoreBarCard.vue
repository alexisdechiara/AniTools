<template>
  <MetricsCard
    title="Mean Score"
    :value="anime?.meanScore.toFixed(2) + ' %'"
    v-bind="$attrs"
  >
    <UTabs
      :items="items"
      class="w-fit absolute top-6 right-6"
      :ui="{ trigger: 'cursor-pointer' }"
      v-model="selectedTab"
    />
    <VisXYContainer :data="scoring" :height="200" class="mt-auto">
      <VisStackedBar
        :x="(d: ScoringData, i: number) => i"
        :y="(d: ScoringData) => d.y"
        :roundedCorners="8"
        :bar-padding="0.2"
      />
      <VisAxis
        type="x"
        :gridLine="false"
        :domainLine="false"
        :tickLine="false"
        tickTextAlign="center"
        :tickFormat="(d: ScoringData, i: number) => scoring[i]?.x"
        :numTicks="5"
      />
      <VisTooltip :triggers="triggers" />
    </VisXYContainer>
  </MetricsCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisTooltip, VisAxis } from "@unovis/vue";
import { StackedBar } from "@unovis/ts";
import type { TabsItem } from "@nuxt/ui";

const items = ref<TabsItem[]>([
  {
    label: "Count",
    value: "count",
    icon: "i-lucide-list-ordered",
  },
  {
    label: "Watch time",
    value: "minutesWatched",
    icon: "i-lucide-clock",
  },
]);

const selectedTab = ref("count");

const { anime } = useStatisticsStore();
// Computed property pour gérer l'affichage en fonction de l'onglet sélectionné
const scoring = computed(
  () =>
    anime?.scores
      ?.map((score) => ({
        x: score?.score ?? 0,
        y: selectedTab.value === "count" ? score?.count : score?.minutesWatched,
        label: score?.meanScore || undefined,
      }))
      .sort((a, b) => a.x - b.x) || ([] as ScoringData[])
);

type ScoringData = {
  x: number;
  y: number;
  label?: number;
};

const triggers = {
  [StackedBar.selectors.bar]: (data: ScoringData) => {
    return `
      <div class='flex flex-col'>
        <span class='font-semibold'>${data.label ? data.label : data.x} %</span>
        <span>${formatValue(data.y)}</span>
      </div>
    `;
  },
};

const formatValue = (value: number) => {
  return selectedTab.value === "count" ? `${value} animes` : formatWatchTime(value);
};
</script>

<style scoped>
.unovis-xy-container {
  --vis-stacked-bar-cursor: pointer;
  --vis-stacked-bar-fill-color: var(--color-completed);
}

:deep(path[class*="bar"]) {
  transition: all 0.3s ease-in-out;
  fill: var(--color-completed) !important;
}

:deep(g[class*="barGroup"] > path) {
  clip-path: inset(0 round 8px);
}

/* Style des barres non survolées quand une barre est survolée */
:deep(g[class*="barGroup"]:hover ~ g[class*="barGroup"]:not(:hover) path[class*="bar"]),
:deep(g[class*="barGroup"]:has(~ g[class*="barGroup"]:hover) path[class*="bar"]) {
  fill: var(--ui-bg-elevated) !important;
}

/* Style de la barre survolée */
:deep(g[class*="barGroup"]:hover path[class*="bar"]) {
  fill: var(--color-completed-hover) !important;
}
</style>

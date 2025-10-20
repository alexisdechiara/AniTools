<template>
  <MetricsCard title="Mean Score" value="70%" v-bind="$attrs">
    <UTabs
      :items="items"
      class="w-fit absolute top-6 right-6"
      :ui="{ trigger: 'cursor-pointer' }"
      v-model="selectedTab"
    />
    <VisXYContainer :data="scoring">
      <VisStackedBar
        :x="(d: ScoringData, i: number) => i"
        :y="(d: ScoringData) => d.score"
        :roundedCorners="8"
        :bar-padding="0.2"
      />
      <VisAxis
        type="x"
        :gridLine="false"
        :domainLine="false"
        :tickLine="false"
        tickTextAlign="center"
        :tickFormat="(d: ScoringData, i: number) => scoring[i]?.month"
        :numTicks="scoring.length"
      />
      <VisTooltip :triggers="triggers" />
    </VisXYContainer>
  </MetricsCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisTooltip, VisAxis } from "@unovis/vue";
import { StackedBar } from "@unovis/ts";
import type { TabsItem } from "@nuxt/ui";
import { computed, ref } from "vue";
import {
  generateRandomScores,
  calculateMonthlyScores,
  calculateScoreRanges,
} from "../../../utils/factories/score.factory";

const items = ref<TabsItem[]>([
  {
    label: "Date",
    value: "date",
    icon: "i-lucide-calendar",
  },
  {
    label: "Rating",
    value: "rating",
    icon: "i-lucide-star",
  },
]);

const selectedTab = ref("date");

// Générer les scores aléatoires en utilisant la factory
const allScores = ref<ScoreEntry[]>(generateRandomScores(100));

// Computed property pour gérer l'affichage en fonction de l'onglet sélectionné
const scoring = computed<ScoringData[]>(() => {
  return selectedTab.value === "date"
    ? calculateMonthlyScores(allScores.value)
    : calculateScoreRanges(allScores.value);
});

interface ScoreEntry {
  month: string;
  score: number;
}

type ScoringData = {
  month: string;
  score: number | string;
};

const triggers = {
  [StackedBar.selectors.bar]: (data: ScoringData) => {
    return `
      <div class='flex flex-col'>
        <span class='font-semibold'>${data.month}</span>
        <span>${data.score} %</span>
      </div>
    `;
  },
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
  fill: var(--color-watching) !important;
}

/* Style de la barre survolée */
:deep(g[class*="barGroup"]:hover path[class*="bar"]) {
  fill: var(--color-completed-hover) !important;
}
</style>

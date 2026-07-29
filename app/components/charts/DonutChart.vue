<template>
  <div
    class="flex gap-6"
    :class="orientation === 'horizontal' ? 'flex-col sm:flex-row' : 'flex-col'"
    role="img"
    :aria-label="chartAriaLabel">
    <VisSingleContainer
      v-if="chartDataForDonut.length"
      :data="chartDataForDonut"
      :width="width"
      :height="height"
      :style="{ '--chart-width': width, '--chart-height': height }"
      aria-hidden="true">
      <VisDonut
        :value="sliceValue"
        :pad-angle="0.05"
        :show-background="false"
        :corner-radius="16"
        :color="color"
        :events="showCentralValue ? events : {}"
        :central-label="showCentralValue ? centralLabelText : ''"
        :central-sub-label="showCentralValue ? centralSubLabelText : ''"
        :angle-range="angleRange || [0, 360]"/>
      <VisTooltip
        v-if="showTooltip"
        :triggers="triggers"/>
    </VisSingleContainer>

    <div
      v-else
      class="flex min-h-36 items-center justify-center text-sm text-muted">
      No data available.
    </div>

    <ul
      v-if="showLegend && processedData.length"
      class="flex flex-col gap-2 text-sm"
      :class="orientation === 'horizontal' ? 'mx-0 justify-center' : 'mx-4'">
      <li
        v-for="item in processedData"
        :key="item.name"
        class="flex items-center justify-start gap-x-2">
        <span
          class="size-2 rounded-full"
          :style="{
            backgroundColor: item.color,
            opacity: isItemInOverflow(item) ? 0.5 : 1,
          }"
          aria-hidden="true"/>
        <span :class="{ 'opacity-50': isItemInOverflow(item) }">
          {{ item.name }}
        </span>
        <span class="ms-auto tabular-nums">{{ legendRawValue(item) }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { Donut } from "@unovis/ts";
import { VisDonut, VisSingleContainer, VisTooltip } from "@unovis/vue";

export type DonutMetric = "count" | "meanScore" | "minutesWatched";

export interface DonutDataItem {
  color: string;
  name: string;
  value: number;
  count?: number;
  meanScore?: number;
  minutesWatched?: number;
  isOverflow?: boolean;
  isOverflowItem?: boolean;
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
    metricType?: DonutMetric;
  }>(),
  {
    width: "100%",
    height: "200px",
    maxItems: 5,
    showLegend: true,
    showTooltip: false,
    showCentralValue: true,
    orientation: "vertical",
    angleRange: () => [0, 360],
    metricType: "count",
  }
);

function getCount(item: DonutDataItem): number {
  return item.count ?? (props.metricType === "count" ? item.value : 0);
}

function getMeanScore(item: DonutDataItem): number {
  return item.meanScore ?? (props.metricType === "meanScore" ? item.value : 0);
}

function getMinutes(item: DonutDataItem): number {
  return item.minutesWatched
    ?? (props.metricType === "minutesWatched" ? item.value : 0);
}

function buildOverflowItem(items: DonutDataItem[]): DonutDataItem {
  const count = items.reduce((sum, item) => sum + getCount(item), 0);
  const minutesWatched = items.reduce(
    (sum, item) => sum + getMinutes(item),
    0
  );
  const weightedScore = items.reduce(
    (sum, item) => sum + getMeanScore(item) * Math.max(1, getCount(item)),
    0
  );
  const scoreWeight = items.reduce(
    (sum, item) => sum + Math.max(1, getCount(item)),
    0
  );
  const meanScore = scoreWeight > 0 ? weightedScore / scoreWeight : 0;
  const value = props.metricType === "meanScore"
    ? meanScore
    : props.metricType === "minutesWatched"
      ? minutesWatched
      : count;

  return {
    name: "Other",
    value: Number(value.toFixed(2)),
    count,
    meanScore: Number(meanScore.toFixed(2)),
    minutesWatched,
    color: "var(--ui-text-muted)",
    isOverflow: true,
    isOverflowItem: false,
  };
}

const processedData = computed<DonutDataItem[]>(() => {
  if (!props.data.length) return [];

  const sortedData = props.data
    .map(item => ({
      ...item,
      isOverflowItem: false,
      isOverflow: false,
    }))
    .toSorted((left, right) => right.value - left.value);

  if (sortedData.length <= props.maxItems || props.maxItems < 2) {
    return sortedData;
  }

  const mainItems = sortedData.slice(0, props.maxItems - 1);
  const overflowItems = sortedData.slice(props.maxItems - 1);

  return [
    ...mainItems,
    buildOverflowItem(overflowItems),
    ...overflowItems.map(item => ({
      ...item,
      isOverflowItem: true,
    })),
  ];
});

const chartDataForDonut = computed(() =>
  processedData.value.filter(item => !item.isOverflowItem)
);
const totalSliceValue = computed(() =>
  chartDataForDonut.value.reduce((sum, item) => sum + sliceValue(item), 0)
);
const chartAriaLabel = computed(() => {
  if (!props.data.length) return "Donut chart: no data available"

  return `Donut chart. ${props.data.map(item =>
    `${item.name}: ${legendRawValue(item)}`
  ).join(", ")}`
})

function isItemInOverflow(item: DonutDataItem): boolean {
  return Boolean(item.isOverflowItem);
}

function sliceValue(item: DonutDataItem): number {
  if (props.metricType === "meanScore") {
    return Math.max(0, getCount(item)) || 1;
  }

  return Math.max(0, item.value);
}

function color(_item: DonutDataItem, index: number): string {
  return chartDataForDonut.value[index]?.color ?? "var(--ui-text-muted)";
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${remainingMinutes}m`;
}

function legendRawValue(item: DonutDataItem): string {
  if (props.metricType === "meanScore") {
    return `${Number(getMeanScore(item).toFixed(2))}%`;
  }
  if (props.metricType === "minutesWatched") {
    return formatDuration(getMinutes(item));
  }

  return getCount(item).toLocaleString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

function getSecondaryLabel(item: DonutDataItem): string {
  if (props.metricType === "meanScore") return legendRawValue(item);

  const percentage = totalSliceValue.value > 0
    ? Math.round((sliceValue(item) / totalSliceValue.value) * 100)
    : 0;
  return `${percentage}%`;
}

const centralLabelText = ref("");
const centralSubLabelText = ref("");

const triggers = {
  [Donut.selectors.segment]: (datum: { index: number }) => {
    const item = chartDataForDonut.value[datum.index];
    if (!item) return "";

    return `
      <div class="flex flex-col p-1">
        <span class="font-semibold capitalize">${escapeHtml(item.name)}</span>
        <span>${escapeHtml(getSecondaryLabel(item))}</span>
      </div>
    `;
  },
};

const events = {
  [Donut.selectors.segment]: {
    mouseover: (datum: { index: number }) => {
      const item = chartDataForDonut.value[datum.index];
      if (!item) return;

      centralLabelText.value = item.name;
      centralSubLabelText.value = getSecondaryLabel(item);
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

.unovis-single-container :deep(*) {
  overflow: visible !important;
}

.unovis-single-container :deep(path[class*="segment"]) {
  cursor: pointer;
  opacity: 1;
  transform: scale(1);
  transform-box: fill-box;
  transform-origin: 50% 50%;
  transition: transform 250ms ease, opacity 250ms ease, fill 250ms ease !important;
}

.unovis-single-container :deep(path[class*="segment"]:hover) {
  filter: brightness(90%) !important;
  opacity: 1 !important;
  transform: scale(1.03) !important;
}

.unovis-single-container:has(path[class*="segment"]:hover)
  :deep(path[class*="segment"]:not(:hover)) {
  opacity: 0.3 !important;
}
</style>

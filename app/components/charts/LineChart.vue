<template>
  <div class="flex flex-col gap-2 w-full">
    <VisXYContainer
      :key="`xy-${selectedMetric}`"
      :data="data"
      :height="height"
      :xDomain="xDomain"
      :scaleByDomain="true"
      class="mt-2"
    >
      <VisArea
        v-if="showArea"
        :key="`area-${selectedMetric}`"
        :x="xAccessor"
        :y="yAccessor"
      />
      <VisLine
        :key="`line-${selectedMetric}`"
        :x="xAccessor"
        :y="yAccessor"
        interpolateMissingData
      />
      <VisAxis
        type="x"
        :gridLine="false"
        :domainLine="false"
        :tickLine="false"
        tickTextAlign="center"
        :tickFormat="(d: number) => String(d)"
        :numTicks="Math.min(5, data.length)"
      />
      <VisAxis
        v-if="showY"
        type="y"
        :gridLine="false"
        :domainLine="false"
        :tickLine="false"
        :tickFormat="(d: number) => formatYAxis(d, selectedMetric)"
        :numTicks="5"
        position="end"
      />
      <VisTooltip v-if="showTooltip" />
      <VisCrosshair :template="crosshairTemplate" :color="crosshairColor" />
    </VisXYContainer>

    <template v-if="showBrush">
      <VisXYContainer
        :key="`brush-xy-${selectedMetric}`"
        :data="data"
        :height="brushHeight"
      >
        <VisLine :key="`brush-line-${selectedMetric}`" :x="xAccessor" :y="yAccessor" />
        <VisBrush
          :key="`brush-${selectedMetric}`"
          :selection="xDomain"
          :onBrush="updateDomain"
          :draggable="true"
        />
        <VisAxis type="x" :numTicks="Math.min(15, data.length)" />
      </VisXYContainer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  VisXYContainer,
  VisLine,
  VisAxis,
  VisTooltip,
  VisCrosshair,
  VisArea,
  VisBrush,
} from "@unovis/vue";

export type LineMetric = "count" | "meanScore" | "minutesWatched";

type LineDatum = any;

const props = withDefaults(
  defineProps<{
    data: any[];
    selectedMetric: LineMetric;
    height?: number;
    brush?: boolean;
    brushHeight?: number;
    autoBrush?: boolean;
    brushThreshold?: number;
    xKey?: string;
    showArea?: boolean;
    showTooltip?: boolean;
    crosshairColor?: string;
    showY?: boolean;
  }>(),
  {
    height: 256,
    brush: false,
    brushHeight: 75,
    autoBrush: true,
    brushThreshold: 25,
    xKey: "year",
    showArea: true,
    showTooltip: true,
    crosshairColor: "var(--ui-color-primary-700)",
    showY: true,
  }
);

const emit = defineEmits<{ (e: "update:domain", value: [number, number]): void }>();

// Accessors
const xAccessor = (d: LineDatum) => Number(d[props.xKey] ?? 0);
const yAccessor = computed(() => (d: LineDatum) => {
  const v = d?.[props.selectedMetric];
  return v == null ? 0 : Number(v);
});

// Domain / Brush handling
const xValues = computed<number[]>(() =>
  (props.data || []).map(xAccessor).filter((n) => Number.isFinite(n))
);
const uniqueXCount = computed<number>(() => new Set(xValues.value).size);

const extent = computed<[number, number]>(() => {
  const xs = xValues.value;
  if (xs.length === 0) return [0, 1];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return [min, max];
});

const xDomain = ref<[number, number]>(extent.value);

watch(extent, (e) => {
  xDomain.value = e;
});

function updateDomain(selection: [number, number], _ev?: any, userDriven?: boolean) {
  if (userDriven) {
    xDomain.value = selection;
    emit("update:domain", selection);
  }
}

// Brush visibility
const showBrush = computed<boolean>(() => {
  if (props.brush) return true;
  if (!props.autoBrush) return false;
  return uniqueXCount.value >= props.brushThreshold;
});

// Y axis formatter
function formatYAxis(value: number, metric: LineMetric): string {
  if (metric === "meanScore") return `${Math.round(value)}%`;
  if (metric === "count") return String(Math.round(value));
  // minutesWatched -> best unit
  const maxValue = Math.max(
    ...(props.data || []).map((d) => Number(d.minutesWatched || 0))
  );
  if (maxValue >= 60 * 24) return `${Math.round(value / (60 * 24))}d`;
  if (maxValue >= 60) return `${Math.round(value / 60)}h`;
  return `${Math.round(value)}m`;
}

// Crosshair template
const crosshairTemplate = (d: LineDatum) => {
  const minutes = Number(d.minutesWatched || 0);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const watchTime =
    days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return `
    <div class='flex flex-col p-1 text-sm gap-0.5'>
      <span class='font-bold text-base mb-0.5'>${(d as any)[props.xKey]}</span>
      <div class='inline-flex justify-between items-center gap-4'>
        <span class='text-thin'>Mean Score</span>
        <span class='font-medium'>${Number(d.meanScore || 0)} %</span>
      </div>
      <div class='inline-flex justify-between items-center gap-4'>
        <span class='text-thin'>Titles Watched</span>
        <span class='font-medium'>${Number(d.count || 0)}</span>
      </div>
      <div class='inline-flex justify-between items-center gap-4'>
        <span class='text-thin'>Watch Time</span>
        <span class='font-medium'>${watchTime}</span>
      </div>
    </div>
  `;
};
</script>

<style scoped>
.unovis-xy-container {
  overflow: visible !important;
  --vis-area-fill-opacity: 0.1;
  --vis-area-hover-fill-opacity: 0.1;
  --vis-color0: var(--ui-color-primary-400);
  --vis-crosshair-line-stroke-color: var(--ui-color-primary-700) !important;
  --vis-crosshair-line-stroke-width: 1px !important;
}
</style>

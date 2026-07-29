<template>
  <MetricsCard title="Activity Overview" v-bind="$attrs">
    <ActivityOverview
      :year="year"
      :show-days="showDays"
      :show-months="showMonths"
      :size="size"
      :activity-data="activityData"
    />
  </MetricsCard>
</template>

<script lang="ts" setup>
import { buildActivityGrid } from "~/utils/statistics";

const props = withDefaults(
  defineProps<{
    year: number;
    activityCounts?: Readonly<Record<string, number>>;
    showDays?: boolean;
    showMonths?: boolean;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    year: () => new Date().getFullYear(),
    activityCounts: () => ({}),
    showDays: false,
    showMonths: false,
    size: "md",
  }
);

const activityData = computed(() => buildActivityGrid(props.year, props.activityCounts));
</script>

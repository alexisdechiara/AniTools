<template>
  <MetricsCard title="Watch time" :value="formattedWatchTime" />
</template>

<script lang="ts" setup>
const statisticsStore = useStatisticsStore();

const formattedWatchTime = computed(() => {
  return formatWatchTime(statisticsStore.totalWatchTime);
});
</script>

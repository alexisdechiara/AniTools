<template>
  <MetricsCard title="Watch time" :value="formattedWatchTime" />
</template>

<script lang="ts" setup>
const statisticsStore = useStatisticsStore();

const formattedWatchTime = computed(() => {
  const totalMinutes = Math.floor(statisticsStore.totalWatchTime);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
});
</script>

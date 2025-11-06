<template>
  <MetricsCard title="Animes Watched" :value="formattedAnimeCount" />
</template>

<script lang="ts" setup>
const { anime } = useStatisticsStore();

const formattedAnimeCount = computed(() => {
  return anime?.count.toLocaleString();
});
</script>

<template>
  <MetricsCard title="Episodes Watched" :value="formattedEpisodeCount" />
</template>

<script lang="ts" setup>
const { anime } = useStatisticsStore();

const formattedEpisodeCount = computed(() => {
  return anime?.episodesWatched.toLocaleString();
});
</script>

<template>
  <MetricsCard title="Episodes Watched" :value="formattedEpisodeCount" />
</template>

<script lang="ts" setup>
const { episodesWatched } = storeToRefs(useStatisticsStore());

const formattedEpisodeCount = computed(() => {
  return episodesWatched.value === undefined
    ? "-"
    : episodesWatched.value.toLocaleString();
});
</script>

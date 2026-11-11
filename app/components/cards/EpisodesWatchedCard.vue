<template>
  <MetricsCard title="Episodes watched" :value="formattedEpisodeCount" />
</template>

<script lang="ts" setup>
const { episodesWatched } = storeToRefs(useStatisticsStore());

const formattedEpisodeCount = computed(() => {
  return episodesWatched.value === undefined
    ? "-"
    : formatNumber(episodesWatched.value);
});
</script>

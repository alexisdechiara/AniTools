<template>
  <MetricsCard title="Animes Watched" :value="formattedAnimeCount" />
</template>

<script lang="ts" setup>
const { count } = storeToRefs(useStatisticsStore());

const formattedAnimeCount = computed(() => {
  return count.value === undefined ? "-" : count.value.toLocaleString();
});
</script>

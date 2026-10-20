<template>
  <MetricsCard title="Anime watched" :value="formattedAnimeCount" />
</template>

<script lang="ts" setup>
const { count } = storeToRefs(useStatisticsStore());

const formattedAnimeCount = computed(() => {
  return count.value === undefined ? "-" : formatNumber(count.value);
});
</script>

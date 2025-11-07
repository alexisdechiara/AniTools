<template>
  <MetricsCard title="Animes Watched" :value="formattedAnimeCount" />
</template>

<script lang="ts" setup>
const { count } = storeToRefs(useStatisticsStore());

const formattedAnimeCount = computed(() => {
  return count.value ? count.value.toLocaleString() : "-";
});
</script>

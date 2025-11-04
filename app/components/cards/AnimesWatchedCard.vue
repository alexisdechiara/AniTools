<template>
  <MetricsCard title="Animes Watched" :value="formattedAnimeCount" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useStatisticsStore } from "~/stores/Statistics";

const statisticsStore = useStatisticsStore();

const formattedAnimeCount = computed(() => {
  return statisticsStore.totalAnimeCount.toLocaleString();
});
</script>

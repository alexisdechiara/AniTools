<template>
  <MetricsCard title="Episodes Watched" :value="formattedEpisodeCount" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useStatisticsStore } from "~/stores/Statistics";

const statisticsStore = useStatisticsStore();

const formattedEpisodeCount = computed(() => {
  return statisticsStore.totalEpisodesWatched.toLocaleString();
});
</script>

<template>
  <MetricsCard title="Watch time" :value="formattedWatchTime" />
</template>

<script lang="ts" setup>
const { minutesWatched } = storeToRefs(useStatisticsStore());

const formattedWatchTime = computed(() => {
	return formatWatchTime(minutesWatched.value);
});
</script>

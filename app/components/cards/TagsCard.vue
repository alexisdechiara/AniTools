<template>
  <ListCard title="Tags" :list="list" />
</template>

<script lang="ts" setup>
const { anime } = storeToRefs(useStatisticsStore());
const { getAnimesByMediaIds } = useEntriesStore();

const list = computed(() => {
  if (!anime.value) return [];
  return anime.value.tags?.map((tag) => ({
    name: tag?.tag?.name,
    count: tag?.count,
    meanScore: tag?.meanScore,
    timeWatched: tag?.minutesWatched,
    entries: getAnimesByMediaIds(
      tag?.mediaIds?.filter((id): id is number => id !== null) || []
    ),
  }));
});
</script>

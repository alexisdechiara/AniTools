<template>
  <ListCard title="Tags" :list="list" v-model:sort="tagsSort" />
</template>

<script lang="ts" setup>
const statisticsStore = useStatisticsStore();
const { tagsSort } = storeToRefs(statisticsStore);
const { getSortedTags } = statisticsStore;
const { getAnimesByMediaIds } = useEntriesStore();

const list = computed(() => {
  if (!getSortedTags(tagsSort.value)) return [];
  return getSortedTags(tagsSort.value).map((tag) => ({
    name: tag?.tag?.name,
    count: tag?.count,
    meanScore: tag?.meanScore,
    minutesWatched: tag?.minutesWatched,
    entries: getAnimesByMediaIds(
      tag?.mediaIds?.filter((id): id is number => id !== null) || []
    ),
  }));
});
</script>

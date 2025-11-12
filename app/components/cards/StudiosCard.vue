<template>
  <ListCard title="Studios" :list="list" v-model:sort="studiosSort" />
</template>

<script lang="ts" setup>
const statisticsStore = useStatisticsStore();
const { studiosSort } = storeToRefs(statisticsStore);
const { getAnimesByMediaIds } = useEntriesStore();

const list = computed(() => {
  if (!statisticsStore.getSortedStudios(studiosSort.value)) return [];
  return statisticsStore.getSortedStudios(studiosSort.value).map((studio) => ({
    name: studio?.studio?.name,
    count: studio?.count,
    meanScore: studio?.meanScore,
    minutesWatched: studio?.minutesWatched,
    entries: getAnimesByMediaIds(
      studio?.mediaIds?.filter((id): id is number => id !== null) || []
    ),
  }));
});
</script>

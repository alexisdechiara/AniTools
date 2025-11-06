<template>
  <ListCard title="Tags" :list="list" @update:sort="updateSort" />
</template>

<script lang="ts" setup>
import { UserStatisticsSort } from "#gql/default";

const { anime, tagsSort } = storeToRefs(useStatisticsStore());
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

function updateSort(sort: string) {
  tagsSort.value = [sort as UserStatisticsSort];
}
</script>

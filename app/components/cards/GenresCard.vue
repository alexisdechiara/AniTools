<template>
  <ListCard title="Genres" :list="list" v-model:sort="genresSort" />
</template>

<script lang="ts" setup>
const statisticsStore = useStatisticsStore();
const { genresSort } = storeToRefs(statisticsStore);
const { getAnimesByMediaIds } = useEntriesStore();

const list = computed(() => {
  if (!statisticsStore.getSortedGenres(genresSort.value)) return [];
  return statisticsStore.getSortedGenres(genresSort.value).map((genre) => ({
    name: genre?.genre,
    count: genre?.count,
    meanScore: genre?.meanScore,
    minutesWatched: genre?.minutesWatched,
    icon: genre?.genre ? icons[genre.genre as keyof typeof icons] : undefined,
    entries: getAnimesByMediaIds(
      genre?.mediaIds?.filter((id): id is number => id !== null) || []
    ),
  }));
});

const icons = {
  Action: "i-lucide-swords",
  Adventure: "i-lucide-map",
  Comedy: "i-lucide-laugh",
  Drama: "i-lucide-theater",
  Ecchi: "i-lucide-heart",
  Fantasy: "i-lucide-sparkles",
  Hentai: "i-lucide-eye",
  Horror: "i-lucide-skull",
  "Mahou Shoujo": "i-lucide-wand",
  Mecha: "i-lucide-cog",
  Music: "i-lucide-music",
  Mystery: "i-lucide-search",
  Psychological: "i-lucide-brain",
  Romance: "i-lucide-heart-handshake",
  "Sci-Fi": "i-lucide-rocket",
  "Slice of Life": "i-lucide-home",
  Sports: "i-lucide-trophy",
  Supernatural: "i-lucide-moon-stars",
  Thriller: "i-lucide-alert-triangle",
};
</script>

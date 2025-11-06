<template>
  <ListCard title="Genres" :list="genres" />
</template>

<script lang="ts" setup>
const { anime } = storeToRefs(useStatisticsStore());
const { getAnimesByMediaIds } = useEntriesStore();

const genres = computed(() => {
  if (!anime.value) return [];
  return anime.value.genres?.map((genre) => ({
    name: genre?.genre,
    count: genre?.count,
    meanScore: genre?.meanScore,
    timeWatched: genre?.minutesWatched,
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

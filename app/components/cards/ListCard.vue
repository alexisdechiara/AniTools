<template>
  <MetricsCard title="Genres" v-bind="$attrs">
    <ol class="flex flex-col group">
      <li
        v-for="(genre, index) in genres"
        :key="genre.name"
        class="flex items-center gap-2 cursor-pointer transition-colors duration-200 py-1.5"
        @mouseover="handleMouseOver(genre.name)"
        @mouseleave="handleMouseLeave()"
      >
        <div class="size-10 bg-elevated rounded-sm aspect-square" />
        <div class="flex flex-col w-full gap-y-1">
          <div class="flex justify-between w-full">
            <span class="text-xs font-medium">{{ genre.name }}</span>
            <span class="text-xs text-dimmed">{{ genre.count }}</span>
          </div>
          <UProgress
            v-model="progressValues[genre.name]"
            :ui="{
              base: 'bg-transparent',
              indicator: `transition-colors group-hover:bg-elevated duration-200 ${
                hoveredGenre === genre.name || (index === 0 && hoveredGenre === null)
                  ? '!bg-primary'
                  : 'bg-elevated'
              }`,
            }"
            size="lg"
          />
        </div>
      </li>
    </ol>
  </MetricsCard>
</template>

<script lang="ts" setup>
const hoveredGenre = ref<string | null>(null);

const handleMouseOver = (genreName: string) => {
  hoveredGenre.value = genreName;
};

const handleMouseLeave = () => {
  hoveredGenre.value = null;
};

type genre = {
  name: string;
  count: number;
  meanScore: number;
  timeWatched: Date | string;
  animes?: {
    id: string;
    name: string;
    score: number;
  }[];
};

const genres = ref<genre[]>(
  [
    {
      name: "Action",
      count: 209,
      meanScore: 80.68,
      timeWatched: "2025-10-20",
      animes: undefined,
    },
    {
      name: "Adventure",
      count: 137,
      meanScore: 80.68,
      timeWatched: "2025-10-20",
      animes: undefined,
    },
    {
      name: "Comedy",
      count: 209,
      meanScore: 80.68,
      timeWatched: "2025-10-20",
      animes: undefined,
    },
    {
      name: "Drama",
      count: 174,
      meanScore: 80.68,
      timeWatched: "2025-10-20",
      animes: undefined,
    },
    {
      name: "Fantasy",
      count: 159,
      meanScore: 80.68,
      timeWatched: "2025-10-20",
      animes: undefined,
    },
  ].sort((a, b) => b.count - a.count)
);

const maxCount = computed(() => {
  if (!genres.value.length) return 0;
  return Math.max(...genres.value.map((g: genre) => g.count));
});

function calculatePercentage(count: number): number {
  if (maxCount.value === 0) return 0;
  return Math.floor(Math.round((count / maxCount.value) * 100));
}

const progressValues = ref<Record<string, number>>({});

// Initialisation des valeurs de progression
watchEffect(() => {
  if (genres.value) {
    genres.value.forEach((genre) => {
      progressValues.value[genre.name] = calculatePercentage(genre.count);
    });
  }
});
</script>

<style scoped></style>

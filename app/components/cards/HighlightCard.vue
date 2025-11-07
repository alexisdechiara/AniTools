<template>
  <MetricsCard v-bind="$attrs">
    <div class="grid grid-cols-13 gap-x-6">
      <div
        class="col-span-6 flex justify-center items-center h-full w-full max-w-50 relative"
      >
        <template v-for="(anime, index) in highlitedAnimes">
          <NuxtImg
            v-if="anime.src"
            v-show="index >= currentIndex"
            :src="anime.src"
            fit="cover"
            class="h-fit w-full scale-90 aspect-3/4 rounded-lg transition-all absolute"
            :class="[
              indexToRotate(index),
              index === currentIndex && 'animate-pulsing-jiggle',
            ]"
          />
        </template>
      </div>
      <div class="col-span-7 flex flex-col gap-y-3 size-full relative">
        <span class="text-xs capitalize text-toned font-medium text-pretty">
          {{ currentHighlightedAnime.title }}
        </span>
        <span class="text-2xl font-semibold text-highlighted text-ellipsis">
          {{ currentHighlightedAnime.name }}
        </span>
        <span class="text-4xl font-bold text-highlighted text-ellipsis">{{
          currentHighlightedAnime.value
        }}</span>
        <div class="absolute top-0 right-0 flex gap-x-3 h-fit">
          <UButton
            icon="i-lucide-chevron-left"
            size="xs"
            color="neutral"
            variant="link"
            @click="currentIndex > 0 && currentIndex--"
            :ui="{ base: 'p-0 cursor-pointer' }"
          />
          <UButton
            icon="i-lucide-chevron-right"
            size="xs"
            color="neutral"
            variant="link"
            @click="currentIndex < highlitedAnimes.length - 1 && currentIndex++"
            :ui="{ base: 'p-0 cursor-pointer' }"
          />
        </div>
      </div>
    </div>
  </MetricsCard>
</template>

<script lang="ts" setup>
const { getBestScoreAnime, getLongestAnime, getMostWatchedAnime } = storeToRefs(
  useStatisticsStore()
);

type Highlight = {
  title: string;
  name: string | null;
  src?: string | null;
  value: string | null;
};

const currentIndex = ref(0);
const highlitedAnimes = ref<Highlight[]>([]);

if (getBestScoreAnime.value?.media) {
  highlitedAnimes.value.push({
    title: "Best score anime",
    name:
      getBestScoreAnime.value?.media?.title?.userPreferred ||
      getBestScoreAnime.value?.media?.title?.english ||
      "",
    src:
      getBestScoreAnime.value?.media?.coverImage?.extraLarge ||
      getBestScoreAnime.value?.media?.coverImage?.large ||
      getBestScoreAnime.value?.media?.coverImage?.medium,
    value: getBestScoreAnime.value?.score!.toString(),
  });
}

if (getLongestAnime.value?.media) {
  highlitedAnimes.value.push({
    title: "Longest time watched anime",
    name:
      getLongestAnime.value?.media?.title?.userPreferred ||
      getLongestAnime.value?.media?.title?.english ||
      "",
    src:
      getLongestAnime.value?.media?.coverImage?.extraLarge ||
      getLongestAnime.value?.media?.coverImage?.large ||
      getLongestAnime.value?.media?.coverImage?.medium,
    value: formatWatchTime(
      getLongestAnime.value?.progress! * getLongestAnime.value?.media?.duration!
    ),
  });
}

if (getMostWatchedAnime.value?.media) {
  highlitedAnimes.value.push({
    title: "Most watched anime",
    name:
      getMostWatchedAnime.value?.media?.title?.userPreferred ||
      getMostWatchedAnime.value?.media?.title?.english ||
      "",
    src:
      getMostWatchedAnime.value?.media?.coverImage?.extraLarge ||
      getMostWatchedAnime.value?.media?.coverImage?.large ||
      getMostWatchedAnime.value?.media?.coverImage?.medium,
    value: getMostWatchedAnime.value?.repeat + " times",
  });
}

function indexToRotate(index: number): string {
  switch (index) {
    case 0:
      return "rotate-[3deg] z-100";
    case 1:
      return "-rotate-[6deg] z-90";
    case 2:
      return "rotate-[1deg] z-80";
    default:
      return "";
  }
}

const currentHighlightedAnime = computed(
  () => highlitedAnimes.value[currentIndex.value]!
);
</script>

<style scoped>
.animate-pulsing-jiggle {
  animation-name: pulsing-jiggle;
  animation-duration: 0.2s;
  animation-timing-function: ease-in-out;
  animation-fill-mode: both;
}

@keyframes pulsing-jiggle {
  0% {
    transform: rotate(0deg) scale(1);
  }

  25% {
    transform: rotate(1deg) scale(1.025);
  }

  50% {
    transform: rotate(0deg) scale(1.05);
  }

  75% {
    transform: rotate(-1deg) scale(1.025);
  }

  100% {
    transform: rotate(0deg) scale(1);
  }
}
</style>

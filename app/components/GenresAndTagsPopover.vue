<template>
  <UPopover
    mode="hover"
    arrow
    :open-delay="0"
    :close-delay="0"
    :content="{
      align: 'center',
      side: 'right',
      sideOffset: 8,
    }"
  >
    <slot />
    <template #content>
      <div class="p-6 space-y-3">
        <div class="flex gap-x-6 justify-between">
          <div class="flex flex-col">
            <span class="text-xs capitalize text-toned font-medium">Count</span>
            <span class="text-xl font-semibold text-highlighted text-ellipsis">{{
              count
            }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs capitalize text-toned font-medium">Mean Score</span>
            <span class="text-xl font-semibold text-highlighted text-ellipsis"
              >{{ meanScore }} %</span
            >
          </div>
          <div class="flex flex-col">
            <span class="text-xs capitalize text-toned font-medium">Watch Time</span>
            <span class="text-xl font-semibold text-highlighted text-ellipsis">{{
              formatWatchTime(minutesWatched)
            }}</span>
          </div>
        </div>
        <UCarousel
          v-slot="{ item }"
          :items="items"
          loop
          :auto-scroll="{
            startDelay: 200,
            stopOnInteraction: false,
            stopOnFocusIn: false,
            stopOnMouseEnter: true,
            speed: 0.5,
          }"
          :ui="{
            root: 'w-full max-w-xs relative',
            container: 'flex ms-0',
            item: 'basis-1/4 ps-0',
          }"
        >
          <NuxtImg
            :src="item.coverImage?.large || item.coverImage?.medium || ''"
            :alt="item.title?.english || item.title?.romaji || ''"
            class="h-24 rounded-sm object-cover"
          />
        </UCarousel>
      </div>
    </template>
  </UPopover>
</template>

<script lang="ts" setup>
import type { listType } from "./cards/ListCard.vue";

const props = defineProps<listType>();

const items = computed(() => {
  return props.entries?.map((entry: any) => entry.media) ?? [];
});
</script>

<style scoped></style>
